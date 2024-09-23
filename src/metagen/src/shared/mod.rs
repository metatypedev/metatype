// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! This module contains common logic for fdk generation
//! imlementations

pub mod client;
pub mod types;

use common::typegraph::{runtimes::TGRuntime, Materializer};

use crate::interlude::*;

#[derive(Debug, Clone)]
pub struct FdkTemplate {
    pub entries: HashMap<&'static str, std::borrow::Cow<'static, str>>,
}

pub struct StubbedFunction {
    #[allow(unused)]
    pub id: u32,
    pub node: TypeNode,
    pub mat: Materializer,
    #[allow(unused)]
    pub runtime: Rc<TGRuntime>,
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
                .map(|idx| (idx as u32, Rc::new(tg.runtimes[idx].clone())))
                .with_context(|| format!("runtime {rt_name} not found in typegraph"))
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

pub fn is_composite(types: &[TypeNode], id: u32) -> bool {
    match &types[id as usize] {
        TypeNode::Function { .. } => panic!("function type isn't composite or scalar"),
        TypeNode::Any { .. } => panic!("unexpected Any type as output"),
        TypeNode::Boolean { .. }
        | TypeNode::Float { .. }
        | TypeNode::Integer { .. }
        | TypeNode::String { .. }
        | TypeNode::File { .. } => false,
        TypeNode::Object { .. } => true,
        TypeNode::Optional { data, .. } => is_composite(types, data.item),
        TypeNode::List { data, .. } => is_composite(types, data.items),
        TypeNode::Union { data, .. } => data.any_of.iter().any(|&id| is_composite(types, id)),
        TypeNode::Either { data, .. } => data.one_of.iter().any(|&id| is_composite(types, id)),
    }
}

pub fn get_gql_type(types: &[TypeNode], id: u32, optional: bool) -> String {
    let name = match &types[id as usize] {
        TypeNode::Optional { data, .. } => return get_gql_type(types, data.item, true),
        TypeNode::List { data, .. } => format!("[{}]", get_gql_type(types, data.items, true)),
        TypeNode::String { base, .. } => {
            if base.as_id {
                "ID".into()
            } else {
                "String".into()
            }
        }
        TypeNode::Boolean { .. } => "Boolean".into(),
        TypeNode::Float { .. } => "Float".into(),
        TypeNode::Integer { .. } => "Int".into(),
        node => node.base().title.clone(),
    };
    if !optional {
        format!("{name}!")
    } else {
        name
    }
}
/*
  getGraphQLType(typeNode: TypeNode, optional = false): string {
    const scalarType = GRAPHQL_SCALAR_TYPES[typeNode.type];
    if (scalarType != null) {
      return scalarType;
    }

    return typeNode.title;
  }
*/
