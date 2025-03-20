// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use color_eyre::eyre::OptionExt as _;

use crate::{
    conv::{PathSegment, RelativePath},
    Edge, EdgeKind, Type, TypeNodeExt as _,
};

pub enum VisitNext {
    Children,
    Siblings,
    Stop,
}

pub struct VisitNode {
    pub ty: Type,
    pub path: Vec<Edge>,
    pub relative_path: RelativePath,
}

pub fn traverse_types<A, V, E: From<color_eyre::eyre::Error>>(
    root: Type,
    relative_path: RelativePath,
    accumulator: A,
    visit_fn: V,
) -> Result<A, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    let mut path = Vec::new();
    traverse_types_with_path(root, &mut path, relative_path, accumulator, &visit_fn)
        .map(|output| output.accumulator)
}

struct TraverseOutput<A> {
    accumulator: A,
    stop: bool,
}

fn visit<A, V, E: From<color_eyre::eyre::Error>>(
    node: Type,
    path: &mut Vec<Edge>,
    relative_path: RelativePath,
    accumulator: &mut A,
    visit_fn: V,
) -> Result<VisitNext, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    let visit_node = VisitNode {
        ty: node,
        path: std::mem::take(path),
        relative_path: relative_path.clone(),
    };
    let res = visit_fn(&visit_node, accumulator);
    let _ = std::mem::replace(path, visit_node.path);
    res
}

fn traverse_types_with_path<A, V, E: From<color_eyre::eyre::Error>>(
    root: Type,
    path: &mut Vec<Edge>,
    relative_path: RelativePath,
    mut accumulator: A,
    visit_fn: &V,
) -> Result<TraverseOutput<A>, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    {
        let rpath = match &root {
            Type::Function(_) => RelativePath::Function(root.idx()),
            _ => relative_path.clone(),
        };
        match visit(root.clone(), path, rpath, &mut accumulator, visit_fn)? {
            VisitNext::Stop => {
                return Ok(TraverseOutput {
                    accumulator,
                    stop: true,
                });
            }
            VisitNext::Siblings => {
                return Ok(TraverseOutput {
                    accumulator,
                    stop: false,
                });
            }
            VisitNext::Children => (),
        }
    }

    let edge = {
        let root = root.clone();
        move |to: &Type, kind: EdgeKind| Edge {
            from: root.downgrade(),
            to: to.clone(),
            kind,
        }
    };

    match &root {
        Type::Boolean(_) | Type::Integer(_) | Type::Float(_) | Type::String(_) | Type::File(_) => {
            Ok(TraverseOutput {
                accumulator,
                stop: false,
            })
        }

        Type::Optional(inner) => {
            let item = inner.item()?.clone();
            path.push(edge(&item, EdgeKind::OptionalItem));
            let res = traverse_types_with_path(
                item,
                path,
                relative_path.push(PathSegment::OptionalItem)?,
                accumulator,
                visit_fn,
            );
            path.pop();
            res
        }

        Type::List(inner) => {
            let item = inner.item()?.clone();
            path.push(edge(&item, EdgeKind::ListItem));
            let res = traverse_types_with_path(
                item,
                path,
                relative_path.push(PathSegment::ListItem)?,
                accumulator,
                visit_fn,
            );
            path.pop();
            res
        }

        Type::Object(inner) => {
            let mut accumulator = Some(accumulator);
            for (key, prop) in inner.properties()? {
                path.push(edge(&prop.type_, EdgeKind::ObjectProperty(key.clone())));
                let output = traverse_types_with_path(
                    prop.type_.clone(),
                    path,
                    relative_path.push(PathSegment::ObjectProp(key.clone()))?,
                    accumulator.take().unwrap(),
                    visit_fn,
                );
                path.pop();

                let output = output?;

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

        Type::Union(inner) => {
            let mut accumulator = Some(accumulator);
            for (i, variant) in inner.variants()?.iter().enumerate() {
                path.push(edge(variant, EdgeKind::UnionVariant(i)));
                let output = traverse_types_with_path(
                    variant.clone(),
                    path,
                    relative_path.push(PathSegment::UnionVariant(i as u32))?,
                    accumulator.take().unwrap(),
                    visit_fn,
                );
                path.pop();

                let output = output?;

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

        Type::Function(inner) => {
            let input = Type::Object(inner.input()?.clone());
            path.push(edge(&input, EdgeKind::FunctionInput));
            let res = traverse_types_with_path(
                input,
                path,
                RelativePath::input(Arc::downgrade(inner), Default::default()),
                accumulator,
                visit_fn,
            );
            path.pop();

            let output = res?;
            if output.stop {
                return Ok(output);
            }

            path.push(edge(inner.output()?, EdgeKind::FunctionOutput));
            let res = traverse_types_with_path(
                inner.output()?.clone(),
                path,
                RelativePath::output(Arc::downgrade(inner), Default::default()),
                output.accumulator,
                visit_fn,
            );
            path.pop();
            res
        }
    }
}

pub trait PathExt {
    fn is_cyclic(&self) -> Result<bool>;
}

impl PathExt for [Edge] {
    fn is_cyclic(&self) -> Result<bool> {
        let mut seen = std::collections::HashSet::new();
        for edge in self {
            if !seen.insert((
                edge.from
                    .upgrade()
                    .ok_or_eyre("failed to upgrade weak ptr")?
                    .key()
                    .clone(),
                edge.to.key().clone(),
            )) {
                return Ok(true);
            }
        }
        Ok(false)
    }
}
