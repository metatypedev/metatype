// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod dedup;
mod kosaraju;

use std::{collections::BTreeMap, sync::Arc};

use kosaraju::Kosaraju;
use tg_schema::{TypeNode, Typegraph};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeIdx(u32);

impl From<u32> for TypeIdx {
    fn from(value: u32) -> Self {
        Self(value)
    }
}
impl From<&u32> for TypeIdx {
    fn from(value: &u32) -> Self {
        Self(*value)
    }
}

impl TypeIdx {
    pub fn size(&self) -> usize {
        self.0 as usize
    }
}

pub fn optimize(tg: Arc<Typegraph>) -> Typegraph {
    let mut k = Kosaraju::new(tg);
    k.run();

    let mut sizes = BTreeMap::new();
    for c in &k.components {
        sizes.entry(c.1.len()).and_modify(|l| *l += 1).or_insert(1);
    }

    let mut dedup = crate::dedup::DedupEngine::from(k);
    dedup.hash_types();
    dedup.get_converted_typegraph()
}

trait DirectedGraph {
    type VertexRef;
    fn out_neighbours(&self, v: &Self::VertexRef) -> Vec<Self::VertexRef>;
}

impl DirectedGraph for Typegraph {
    type VertexRef = TypeIdx;

    fn out_neighbours(&self, v: &TypeIdx) -> Vec<TypeIdx> {
        let type_node = &self.types[v.size()];

        use TypeNode as N;
        match type_node {
            N::Boolean { .. }
            | N::Integer { .. }
            | N::Float { .. }
            | N::String { .. }
            | N::File { .. } => vec![],

            N::Optional { data, .. } => vec![data.item.into()],

            N::List { data, .. } => vec![data.items.into()],

            N::Object { data, .. } => data.properties.values().map(|v| v.into()).collect(),

            N::Union { data, .. } => data.any_of.iter().map(|v| v.into()).collect(),

            N::Either { data, .. } => data.one_of.iter().map(|v| v.into()).collect(),

            N::Function { data, .. } => {
                let mut res = vec![data.input.into(), data.output.into()];
                if let Some(pt) = &data.parameter_transform {
                    res.push(pt.resolver_input.into());
                }
                res
            }

            N::Any { .. } => unreachable!(),
        }
    }
}
