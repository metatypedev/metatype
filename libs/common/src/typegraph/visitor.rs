// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use indexmap::IndexMap;
use std::{collections::HashSet, fmt::Display};

use super::{TypeNode, Typegraph};

impl Typegraph {
    /// Depth-first traversal over all the types
    pub fn traverse_types<V: TypeVisitor + Sized>(&self, visitor: V) -> Option<V::Return> {
        let mut traversal = TypegraphTraversal {
            tg: self,
            path: vec![],
            as_input: false,
            visited_types: HashSet::new(),
            visited_input_types: HashSet::new(),
            visitor,
        };
        traversal
            .visit_type(0)
            .or_else(|| traversal.visitor.get_result())
        // if let Some(ret) = traversal.visit_type(0) {
        //     ret
        // } else {
        //     traversal.visitor.get_result()
        // }
    }
}

struct TypegraphTraversal<'a, V: TypeVisitor + Sized> {
    tg: &'a Typegraph,
    path: Vec<PathSegment<'a>>,
    as_input: bool,
    visited_types: HashSet<u32>, // non input types
    visited_input_types: HashSet<u32>,
    visitor: V,
}

impl<'a, V: TypeVisitor + Sized> TypegraphTraversal<'a, V> {
    fn visit_type(&mut self, type_idx: u32) -> Option<V::Return> {
        if self.as_input {
            if self.visited_input_types.contains(&type_idx) {
                return None;
            }
            self.visited_input_types.insert(type_idx);
        } else {
            if self.visited_types.contains(&type_idx) {
                return None;
            }
            self.visited_types.insert(type_idx);
        }

        let res = self
            .visitor
            .visit(type_idx, &self.path, self.tg, self.as_input);
        let type_node = &self.tg.types[type_idx as usize];

        match res {
            VisitResult::Continue(deeper) if deeper => match type_node {
                TypeNode::Optional { data, .. } => self.visit_optional(type_idx, data.item),
                TypeNode::Object { data, .. } => self.visit_object(type_idx, &data.properties),
                TypeNode::Array { data, .. } => self.visit_array(type_idx, data.items),
                TypeNode::Union { data, .. } => self.visit_union(type_idx, &data.any_of),
                TypeNode::Either { data, .. } => self.visit_either(type_idx, &data.one_of),
                TypeNode::Function { data, .. } => {
                    self.visit_function(type_idx, data.input, data.output)
                }
                TypeNode::Boolean { .. }
                | TypeNode::Number { .. }
                | TypeNode::Integer { .. }
                | TypeNode::String { .. }
                | TypeNode::Any { .. } => {
                    // scalar types -- no children
                    None
                }
            },
            VisitResult::Continue(_) => None,
            VisitResult::Return(ret) => Some(ret),
        }
    }

    fn visit_optional(&mut self, type_idx: u32, item_type_idx: u32) -> Option<V::Return> {
        self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::OptionalItem,
            },
            item_type_idx,
            false,
        )
    }

    fn visit_array(&mut self, type_idx: u32, item_type_idx: u32) -> Option<V::Return> {
        self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::ArrayItem,
            },
            item_type_idx,
            false,
        )
    }

    fn visit_object(
        &mut self,
        type_idx: u32,
        props: &'a IndexMap<String, u32>,
    ) -> Option<V::Return> {
        for (prop_name, prop_type) in props.iter() {
            let res = self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge: Edge::ObjectProp(prop_name),
                },
                *prop_type,
                false,
            );
            if let Some(res) = res {
                return Some(res);
            }
        }
        None
    }

    fn visit_union(&mut self, type_idx: u32, variants: &'a [u32]) -> Option<V::Return> {
        for (i, variant_type) in variants.iter().enumerate() {
            let res = self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge: Edge::UnionVariant(i),
                },
                *variant_type,
                false,
            );
            if let Some(ret) = res {
                return Some(ret);
            }
        }
        None
    }

    fn visit_either(&mut self, type_idx: u32, variants: &'a [u32]) -> Option<V::Return> {
        variants.iter().enumerate().find_map(|(i, t)| {
            self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge: Edge::EitherVariant(i),
                },
                *t,
                false,
            )
        })
    }

    fn visit_function(&mut self, type_idx: u32, input: u32, output: u32) -> Option<V::Return> {
        [
            (Edge::FunctionInput, input, true),
            (Edge::FunctionOutput, output, false),
        ]
        .into_iter()
        .find_map(|(edge, t, as_input)| {
            self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge,
                },
                t,
                as_input,
            )
        })
    }

    fn visit_child(
        &mut self,
        segment: PathSegment<'a>,
        type_idx: u32,
        as_input: bool,
    ) -> Option<V::Return> {
        let root_input = as_input && !self.as_input;
        if root_input {
            self.as_input = as_input;
        }

        self.path.push(segment);
        let res = self.visit_type(type_idx);
        self.path.pop().unwrap();

        if root_input {
            self.as_input = false;
        }
        res
    }
}

#[derive(Debug)]
pub struct PathSegment<'a> {
    #[allow(dead_code)]
    from: u32, // typeIdx
    edge: Edge<'a>,
}

impl<'a> Display for PathSegment<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.edge {
            Edge::ObjectProp(name) => write!(f, "{}", name)?,
            Edge::ArrayItem => write!(f, "[]")?,
            Edge::OptionalItem => write!(f, "*")?,
            Edge::FunctionInput => write!(f, "[in]")?,
            Edge::FunctionOutput => write!(f, "[out]")?,
            Edge::EitherVariant(v) | Edge::UnionVariant(v) => write!(f, "{}", v)?,
        }
        Ok(())
    }
}

pub struct Path<'a>(pub &'a [PathSegment<'a>]);

impl<'a> Display for Path<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for segment in self.0.iter() {
            write!(f, "/{segment}")?;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub enum Edge<'a> {
    ObjectProp(&'a str),
    ArrayItem,
    OptionalItem,
    FunctionInput,
    FunctionOutput,
    EitherVariant(usize),
    UnionVariant(usize),
}

pub enum VisitResult<T> {
    Continue(bool),
    Return(T),
}

pub trait TypeVisitor {
    type Return: Sized;

    /// return true to continue the traversal on the subgraph
    fn visit(
        &mut self,
        type_idx: u32,
        path: &[PathSegment],
        tg: &Typegraph,
        as_input: bool,
    ) -> VisitResult<Self::Return>;

    fn get_result(self) -> Option<Self::Return>
    where
        Self: Sized,
    {
        None
    }
}
