// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{Edge, EdgeKind, Type, TypeNodeExt as _};

pub enum VisitNext {
    Children,
    Siblings,
    Stop,
}

pub fn traverse_types<A, V, E>(root: Type, accumulator: A, visit_fn: V) -> Result<A, E>
where
    V: Fn(Type, &[Edge], &mut A) -> Result<VisitNext, E>,
{
    let mut path = Vec::new();
    traverse_types_with_path(root, &mut path, accumulator, &visit_fn)
        .map(|output| output.accumulator)
}

struct TraverseOutput<A> {
    accumulator: A,
    stop: bool,
}

fn traverse_types_with_path<A, V, E>(
    root: Type,
    path: &mut Vec<Edge>,
    mut accumulator: A,
    visit_fn: &V,
) -> Result<TraverseOutput<A>, E>
where
    V: Fn(Type, &[Edge], &mut A) -> Result<VisitNext, E>,
{
    {
        match visit_fn(root.clone(), path, &mut accumulator)? {
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
            let item = inner.item().clone();
            path.push(edge(&item, EdgeKind::OptionalItem));
            let output = traverse_types_with_path(item, path, accumulator, visit_fn)?;
            path.pop();
            Ok(output)
        }

        Type::List(inner) => {
            let item = inner.item().clone();
            path.push(edge(&item, EdgeKind::ListItem));
            let output = traverse_types_with_path(item, path, accumulator, visit_fn)?;
            path.pop();
            Ok(output)
        }

        Type::Object(inner) => {
            let mut accumulator = Some(accumulator);
            for (key, prop) in inner.properties() {
                path.push(edge(&prop.type_, EdgeKind::ObjectProperty(key.clone())));

                let output = traverse_types_with_path(
                    prop.type_.clone(),
                    path,
                    accumulator.take().unwrap(),
                    visit_fn,
                )?;

                path.pop();

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
            for (i, variant) in inner.variants().iter().enumerate() {
                path.push(edge(variant, EdgeKind::UnionVariant(i)));

                let output = traverse_types_with_path(
                    variant.clone(),
                    path,
                    accumulator.take().unwrap(),
                    visit_fn,
                )?;

                path.pop();

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
            let input = Type::Object(inner.input().clone());
            path.push(edge(&input, EdgeKind::FunctionInput));
            let res = traverse_types_with_path(input, path, accumulator, visit_fn)?;
            path.pop();

            if res.stop {
                return Ok(res);
            }

            path.push(edge(inner.output(), EdgeKind::FunctionOutput));
            let res =
                traverse_types_with_path(inner.output().clone(), path, res.accumulator, visit_fn)?;
            path.pop();
            Ok(res)
        }
    }
}

pub trait PathExt {
    fn is_cyclic(&self) -> bool;
}

impl PathExt for [Edge] {
    fn is_cyclic(&self) -> bool {
        let mut seen = std::collections::HashSet::new();
        for edge in self {
            if !seen.insert((
                edge.from.upgrade().unwrap().key().clone(),
                edge.to.key().clone(),
            )) {
                return true;
            }
        }
        false
    }
}
