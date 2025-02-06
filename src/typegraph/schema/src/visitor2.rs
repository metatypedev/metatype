// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{cell::RefCell, rc::Rc};

use crate::{
    visitor::{Edge, PathSegment},
    TypeNode, Typegraph,
};

pub struct VisitorContext<'tg> {
    pub tg: &'tg Typegraph,
    pub current_node: CurrentNode<'tg>,
}

pub struct NearestFn {
    pub path_index: usize,
    pub type_idx: u32,
    pub is_input: bool,
}

impl<'a> CurrentNode<'a> {
    pub fn nearest_function(&self) -> Option<NearestFn> {
        for (i, segment) in self.path.borrow().iter().enumerate().rev() {
            match segment.edge {
                Edge::FunctionInput => {
                    return Some(NearestFn {
                        path_index: i,
                        type_idx: segment.from,
                        is_input: true,
                    })
                }
                Edge::FunctionOutput => {
                    return Some(NearestFn {
                        path_index: i,
                        type_idx: segment.from,
                        is_input: false,
                    })
                }
                _ => continue,
            }
        }
        None
    }
}

pub enum VisitNext {
    /// continue traversal, with the eventual child nodes
    Children,
    /// continue traversal, but do not visit the children
    Siblings,
    Stop,
}

pub fn traverse_types<'tg, 'path, A, V, E>(
    tg: &'tg Typegraph,
    root_type_idx: u32,
    accumulator: A,
    visit_fn: V,
) -> Result<A, E>
where
    V: Fn(VisitorContext<'tg>, &mut A) -> Result<VisitNext, E>,
{
    let path = Rc::new(RefCell::new(Vec::new()));
    let output = traverse_types_with_path(tg, root_type_idx, &path, accumulator, &visit_fn)?;
    Ok(output.accumulator)
}

struct TraverseOutput<A> {
    accumulator: A,
    stop: bool,
}

type SharedPath = Rc<RefCell<Vec<PathSegment>>>;

#[derive(Debug)]
pub struct CurrentNode<'tg> {
    pub type_node: &'tg TypeNode,
    pub type_idx: u32,
    pub path: SharedPath,
    pub in_cycle: bool,
}

fn traverse_types_with_path<'tg, A, V, E>(
    tg: &'tg Typegraph,
    type_idx: u32,
    path: &Rc<RefCell<Vec<PathSegment>>>,
    mut accumulator: A,
    visit_fn: &V,
) -> Result<TraverseOutput<A>, E>
where
    V: Fn(VisitorContext<'tg>, &mut A) -> Result<VisitNext, E>,
{
    let type_node = &tg.types[type_idx as usize];

    // visit current
    {
        let current_node = CurrentNode {
            type_node,
            type_idx,
            path: path.clone(),
            in_cycle: path.borrow().iter().any(|seg| seg.from == type_idx),
        };
        let cx = VisitorContext { tg, current_node };
        match visit_fn(cx, &mut accumulator)? {
            VisitNext::Stop => {
                return Ok(TraverseOutput {
                    accumulator,
                    stop: true,
                })
            }
            VisitNext::Siblings => {
                return Ok(TraverseOutput {
                    accumulator,
                    stop: false,
                })
            }
            VisitNext::Children => (),
        }
    }

    let push = {
        let path = path.clone();
        move |edge: Edge| {
            path.borrow_mut().push(PathSegment {
                from: type_idx,
                edge,
            });
        }
    };

    let pop = {
        let path = path.clone();
        move || {
            path.borrow_mut().pop();
        }
    };

    // visit children
    match type_node {
        TypeNode::Boolean { .. }
        | TypeNode::Integer { .. }
        | TypeNode::Float { .. }
        | TypeNode::String { .. }
        | TypeNode::File { .. }
        | TypeNode::Any { .. } => Ok(TraverseOutput {
            accumulator,
            stop: false,
        }),

        TypeNode::Optional { data, .. } => {
            let item_type_idx = data.item;
            push(Edge::OptionalItem);
            let output = traverse_types_with_path(tg, item_type_idx, path, accumulator, visit_fn)?;
            pop();
            Ok(output)
        }

        TypeNode::List { data, .. } => {
            let item_type_idx = data.items;
            push(Edge::ArrayItem);
            let output = traverse_types_with_path(tg, item_type_idx, path, accumulator, visit_fn)?;
            pop();
            Ok(output)
        }

        TypeNode::Object { data, .. } => {
            let mut accumulator = Some(accumulator);
            for (key, prop_idx) in data.properties.iter() {
                push(Edge::ObjectProp(key.clone()));
                let output = traverse_types_with_path(
                    tg,
                    *prop_idx,
                    path,
                    accumulator.take().unwrap(),
                    visit_fn,
                )?;
                pop();
                if output.stop {
                    return Ok(output);
                }
                accumulator = Some(output.accumulator);
            }
            Ok(TraverseOutput {
                accumulator: accumulator.unwrap(),
                stop: false,
            })
        }

        TypeNode::Union { data, .. } => {
            let mut accumulator = Some(accumulator);
            for (v, &item_type_idx) in data.any_of.iter().enumerate() {
                push(Edge::UnionVariant(v));
                let output = traverse_types_with_path(
                    tg,
                    item_type_idx,
                    path,
                    accumulator.take().unwrap(),
                    visit_fn,
                )?;
                pop();
                if output.stop {
                    return Ok(output);
                }
                accumulator = Some(output.accumulator);
            }
            Ok(TraverseOutput {
                accumulator: accumulator.unwrap(),
                stop: false,
            })
        }

        TypeNode::Either { data, .. } => {
            let mut accumulator = Some(accumulator);
            for (v, &item_type_idx) in data.one_of.iter().enumerate() {
                push(Edge::EitherVariant(v));
                let output = traverse_types_with_path(
                    tg,
                    item_type_idx,
                    path,
                    accumulator.take().unwrap(),
                    visit_fn,
                )?;
                pop();
                if output.stop {
                    return Ok(output);
                }
                accumulator = Some(output.accumulator);
            }
            Ok(TraverseOutput {
                accumulator: accumulator.unwrap(),
                stop: false,
            })
        }

        TypeNode::Function { data, .. } => {
            let input_type_idx = data.input;
            push(Edge::FunctionInput);
            let output = traverse_types_with_path(tg, input_type_idx, path, accumulator, visit_fn)?;
            pop();
            if output.stop {
                return Ok(output);
            }

            let output_type_idx = data.output;
            push(Edge::FunctionOutput);
            let output =
                traverse_types_with_path(tg, output_type_idx, path, output.accumulator, visit_fn)?;
            pop();
            Ok(output)
        }
    }
}
