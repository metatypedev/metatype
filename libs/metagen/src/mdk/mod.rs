//! This module contains common logic for mdk generation
//! imlementations
use common::typegraph::{runtimes::TGRuntime, Materializer};

use crate::interlude::*;

pub struct StubbedFunction {
    pub id: u32,
    pub node: TypeNode,
    pub mat: Materializer,
    pub runtime: Arc<TGRuntime>,
}

pub fn filter_stubbed_funcs(
    tg: &Typegraph,
    stubbed_runtimes: &[String],
) -> anyhow::Result<Vec<StubbedFunction>> {
    let stubbed_runtimes = stubbed_runtimes
        .iter()
        .map(|rt_name| {
            tg.runtimes
                .iter()
                .position(|rt| rt_name == rt.name())
                .map(|idx| (idx as u32, Arc::new(tg.runtimes[idx].clone())))
                .with_context(|| format!("runtime {rt_name} not found"))
        })
        .collect::<Result<HashMap<_, _>, _>>()?;
    let stubbed_materializers = tg
        .materializers
        .iter()
        .enumerate()
        // TODO: consider filtering out non "function" mats
        .filter(|(_, mat)| stubbed_runtimes.contains_key(&mat.runtime))
        .map(|(id, _)| id as u32)
        .collect::<HashSet<_>>();
    let stubbed_funcs = tg
        .types
        .iter()
        .enumerate()
        .filter_map(|(id, node)| match node {
            TypeNode::Function { data, .. }
                if stubbed_materializers.contains(&data.materializer) =>
            {
                let mat = tg.materializers[data.materializer as usize].clone();
                Some(StubbedFunction {
                    id: id as _,
                    node: node.clone(),
                    runtime: stubbed_runtimes.get(&mat.runtime).unwrap().clone(),
                    mat,
                })
            }
            _ => None,
        })
        .collect();
    Ok(stubbed_funcs)
}
