// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{interlude::*, path::RelativePath, TypeNode as _};
use crate::{Edge, EdgeKind, Type, TypeNodeExt as _};

pub enum VisitNext {
    Children,
    Siblings,
    Stop,
}

pub struct VisitNode {
    pub ty: Type,
    pub path: Vec<Edge>,
}

pub fn traverse_types<A, V, E: From<color_eyre::eyre::Error>>(
    root: Type,
    accumulator: A,
    visit_fn: V,
) -> Result<A, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    let mut path = Vec::new();
    traverse_types_with_path(root, &mut path, accumulator, &visit_fn)
        .map(|output| output.accumulator)
}

struct TraverseOutput<A> {
    accumulator: A,
    stop: bool,
}

fn visit<A, V, E: From<color_eyre::eyre::Error>>(
    node: Type,
    path: &mut Vec<Edge>,
    accumulator: &mut A,
    visit_fn: V,
) -> Result<VisitNext, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    let visit_node = VisitNode {
        ty: node,
        path: std::mem::take(path),
    };
    let res = visit_fn(&visit_node, accumulator);
    let _ = std::mem::replace(path, visit_node.path);
    res
}

fn traverse_types_with_path<A, V, E: From<color_eyre::eyre::Error>>(
    root: Type,
    path: &mut Vec<Edge>,
    mut accumulator: A,
    visit_fn: &V,
) -> Result<TraverseOutput<A>, E>
where
    V: Fn(&VisitNode, &mut A) -> Result<VisitNext, E>,
{
    {
        match visit(root.clone(), path, &mut accumulator, visit_fn)? {
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

    // TODO(perf): without allocation??
    let edges = root.edges();

    let mut acc = Some(accumulator);

    for edge in edges.into_iter() {
        let child = edge.to.clone();
        path.push(edge);
        let output = traverse_types_with_path(child, path, acc.take().unwrap(), visit_fn)?;
        path.pop();

        if output.stop {
            return Ok(output);
        }
        acc = Some(output.accumulator);
    }

    Ok(TraverseOutput {
        accumulator: acc.unwrap(),
        stop: false,
    })
}

pub trait PathExt {
    fn is_cyclic(&self) -> bool;
    fn to_rpath(&self, root: Option<RelativePath>) -> Option<RelativePath>;
}

impl PathExt for [Edge] {
    fn is_cyclic(&self) -> bool {
        let mut seen = std::collections::HashSet::new();
        for edge in self {
            if !seen.insert((edge.from.upgrade().unwrap().key(), edge.to.key())) {
                return true;
            }
        }
        false
    }

    fn to_rpath(&self, root: Option<RelativePath>) -> Option<RelativePath> {
        let latest_fn_idx = self.iter().enumerate().rev().find_map(|(idx, edge)| {
            if let Type::Function(_) = edge.from.upgrade().unwrap() {
                Some(idx)
            } else {
                None
            }
        });

        match latest_fn_idx {
            None => root.and_then(|root| {
                let mut rpath = root;
                for edge in self {
                    rpath = rpath.push_edge(edge).ok()?;
                }
                Some(rpath)
            }),
            Some(fn_idx) => {
                let owner = self[fn_idx].from.upgrade().unwrap();
                let owner = owner.assert_func().unwrap();
                let owner = Arc::downgrade(owner);
                match &self[fn_idx].kind {
                    EdgeKind::FunctionInput => {
                        let mut rpath = RelativePath::input(owner, Default::default());
                        for edge in self.iter().skip(fn_idx + 1) {
                            rpath = rpath.push_edge(edge).ok()?;
                        }
                        Some(rpath)
                    }
                    EdgeKind::FunctionOutput => {
                        let mut rpath = RelativePath::output(owner, Default::default());
                        for edge in self.iter().skip(fn_idx + 1) {
                            rpath = rpath.push_edge(edge).ok()?;
                        }
                        Some(rpath)
                    }
                    _ => unreachable!(),
                }
            }
        }
    }
}

#[derive(Debug)]
pub enum Infallible {}
impl From<color_eyre::eyre::ErrReport> for Infallible {
    fn from(e: color_eyre::eyre::ErrReport) -> Self {
        unreachable!("{:?}", e)
    }
}
