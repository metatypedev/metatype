// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
use std::{collections::HashSet, fmt::Display};

use super::{TypeNode, Typegraph};

#[derive(Clone)]
pub struct DefaultLayer;

pub struct ChildNode<'a>(pub PathSegment<'a>, pub u32);

pub trait VisitLayer<'a, V: TypeVisitor<'a>>: Clone + Sized + 'a {
    fn visit(
        &self,
        traversal: &mut TypegraphTraversal<'a, V, Self>,
        source: impl Iterator<Item = ChildNode<'a>>,
        context: &'a V::Context,
    ) -> Option<V::Return>;
}

impl<'a, V: TypeVisitor<'a>> VisitLayer<'a, V> for DefaultLayer {
    fn visit(
        &self,
        traversal: &mut TypegraphTraversal<'a, V, Self>,
        source: impl Iterator<Item = ChildNode<'a>>,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        for ChildNode(path_seg, idx) in source {
            if let Some(res) = visit_child(traversal, path_seg, idx, context) {
                return Some(res);
            }
        }
        None
    }
}

pub fn visit_child<'a, V: TypeVisitor<'a>, L: VisitLayer<'a, V>>(
    traversal: &mut TypegraphTraversal<'a, V, L>,
    path_seg: PathSegment<'a>,
    idx: u32,
    context: &'a V::Context,
) -> Option<V::Return> {
    traversal.visit_child(path_seg, idx, context)
}

impl Typegraph {
    /// Depth-first traversal over all the types
    pub fn traverse_types<'a, V, L>(
        &'a self,
        visitor: V,
        context: &'a V::Context,
        layer: L,
    ) -> Option<V::Return>
    where
        V: TypeVisitor<'a> + Sized + 'a,
        L: VisitLayer<'a, V>,
    {
        let mut traversal = TypegraphTraversal {
            tg: self,
            path: vec![],
            visited_types: HashSet::new(),
            visited_input_types: HashSet::new(),
            visitor,
            as_input: false,
            layer,
        };
        traversal
            .visit_type(0, context)
            .or_else(|| traversal.visitor.take_result())
    }
}

pub struct FunctionMetadata {
    pub idx: u32,
    // TODO Vec<>
    pub path: String,
    pub parent_struct_idx: u32,
}

pub struct TypegraphTraversal<'a, V, L = DefaultLayer>
where
    V: TypeVisitor<'a> + Sized + 'a,
    L: VisitLayer<'a, V>,
{
    tg: &'a Typegraph,
    path: Vec<PathSegment<'a>>,
    as_input: bool,
    visited_types: HashSet<u32>, // non input types
    visited_input_types: HashSet<u32>,
    visitor: V,
    layer: L,
}

impl<'a, V, L> TypegraphTraversal<'a, V, L>
where
    V: TypeVisitor<'a> + Sized,
    L: VisitLayer<'a, V>,
{
    fn visit_type(&mut self, type_idx: u32, context: &'a V::Context) -> Option<V::Return> {
        let res = if self.as_input {
            if self.visited_input_types.contains(&type_idx) {
                return None;
            }
            self.visited_input_types.insert(type_idx);
            let type_node = &context.get_typegraph().types[type_idx as usize];
            let node = CurrentNode {
                type_idx,
                type_node,
                path: &self.path,
            };

            self.visitor.visit_input_type(node, context)
        } else {
            if self.visited_types.contains(&type_idx) {
                return None;
            }
            self.visited_types.insert(type_idx);

            let type_node = &context.get_typegraph().types[type_idx as usize];
            let node = CurrentNode {
                type_idx,
                type_node,
                path: &self.path,
            };

            self.visitor.visit(node, context)
        };

        let type_node = &self.tg.types[type_idx as usize];

        match res {
            VisitResult::Continue(deeper) if deeper => match type_node {
                TypeNode::Optional { data, .. } => {
                    self.visit_optional(type_idx, data.item, context)
                }
                TypeNode::Object { data, .. } => {
                    self.visit_object(type_idx, &data.properties, context)
                }
                TypeNode::List { data, .. } => self.visit_array(type_idx, data.items, context),
                TypeNode::Union { data, .. } => self.visit_union(type_idx, &data.any_of, context),
                TypeNode::Either { data, .. } => self.visit_either(type_idx, &data.one_of, context),
                TypeNode::Function { data, .. } => {
                    self.visit_function(type_idx, data.input, data.output, context)
                }
                TypeNode::Boolean { .. }
                | TypeNode::Float { .. }
                | TypeNode::Integer { .. }
                | TypeNode::String { .. }
                | TypeNode::File { .. }
                | TypeNode::Any { .. } => {
                    // scalar types -- no children
                    None
                }
            },
            VisitResult::Continue(_) => None,
            VisitResult::Return(ret) => Some(ret),
        }
    }

    fn visit_optional(
        &mut self,
        type_idx: u32,
        item_type_idx: u32,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::OptionalItem,
            },
            item_type_idx,
            context,
        )
    }

    fn visit_array(
        &mut self,
        type_idx: u32,
        item_type_idx: u32,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::ArrayItem,
            },
            item_type_idx,
            context,
        )
    }

    fn visit_object(
        &mut self,
        type_idx: u32,
        props: &'a IndexMap<String, u32>,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        self.visit_children(
            props.iter().map(|(name, idx)| {
                (
                    PathSegment {
                        from: type_idx,
                        edge: Edge::ObjectProp(name),
                    },
                    *idx,
                )
            }),
            context,
        )
    }

    fn visit_union(
        &mut self,
        type_idx: u32,
        variants: &'a [u32],
        context: &'a V::Context,
    ) -> Option<V::Return> {
        for (i, variant_type) in variants.iter().enumerate() {
            let res = self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge: Edge::UnionVariant(i),
                },
                *variant_type,
                context,
            );
            if let Some(ret) = res {
                return Some(ret);
            }
        }
        None
    }

    fn visit_either(
        &mut self,
        type_idx: u32,
        variants: &'a [u32],
        context: &'a V::Context,
    ) -> Option<V::Return> {
        variants.iter().enumerate().find_map(|(i, t)| {
            self.visit_child(
                PathSegment {
                    from: type_idx,
                    edge: Edge::EitherVariant(i),
                },
                *t,
                context,
            )
        })
    }

    fn visit_function(
        &mut self,
        type_idx: u32,
        input: u32,
        output: u32,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        if self.as_input {
            // TODO warning
            return None;
        }

        let last_path_seg = self.path.last().unwrap();
        match last_path_seg.edge {
            Edge::ObjectProp(_) => {}
            _ => {
                return Some(V::Return::from_error(
                    Path(&self.path).to_string(),
                    "Function is only allowed as struct field (direct child)".to_string(),
                ));
            }
        }

        self.as_input = true;
        let res = self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::FunctionInput,
            },
            input,
            context,
        );
        self.as_input = false;

        if let Some(ret) = res {
            return Some(ret);
        }

        let res = self.visit_child(
            PathSegment {
                from: type_idx,
                edge: Edge::FunctionOutput,
            },
            output,
            context,
        );

        res
    }

    fn visit_children(
        &mut self,
        children: impl Iterator<Item = (PathSegment<'a>, u32)>,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        self.layer.clone().visit(
            self,
            children.map(|(seg, idx)| ChildNode(seg, idx)),
            context,
        )
    }

    fn visit_child(
        &mut self,
        segment: PathSegment<'a>,
        type_idx: u32,
        context: &'a V::Context,
    ) -> Option<V::Return> {
        self.path.push(segment);
        let res = self.visit_type(type_idx, context);
        self.path.pop().unwrap();
        res
    }
}

#[derive(Debug, Clone)]
pub struct PathSegment<'a> {
    #[allow(dead_code)]
    pub from: u32, // typeIdx
    pub edge: Edge<'a>,
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

#[derive(Debug, Clone)]
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

#[derive(Clone, Copy)]
pub struct CurrentNode<'a> {
    pub type_idx: u32,
    pub type_node: &'a TypeNode,
    pub path: &'a [PathSegment<'a>],
}

pub trait TypeVisitorContext {
    fn get_typegraph(&self) -> &Typegraph;
}

pub trait TypeVisitor<'a> {
    type Return: Sized + VisitorResult;
    type Context: TypeVisitorContext + Clone;

    /// return true to continue the traversal on the subgraph
    fn visit(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return>;

    fn visit_input_type(
        &mut self,
        current_node: CurrentNode<'_>,
        context: &Self::Context,
    ) -> VisitResult<Self::Return> {
        self.visit(current_node, context)
    }

    fn take_result(&mut self) -> Option<Self::Return>
    where
        Self: Sized,
    {
        None
    }
}

pub trait VisitorResult {
    fn from_error(path: String, message: String) -> Self;
}
