// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! This module contains common logic for fdk generation
//! imlementations

pub mod client;
pub mod files;
pub mod manifest;
pub mod node_metas;
pub mod types;

use std::collections::HashSet;

use crate::interlude::*;
use typegraph::{FunctionType, TypeNode as _};

#[derive(Debug, Clone)]
pub struct FdkTemplate {
    pub entries: IndexMap<&'static str, std::borrow::Cow<'static, str>>,
}

pub fn filter_stubbed_funcs(
    tg: &Typegraph,
    stubbed_runtimes: &[String],
) -> anyhow::Result<Vec<Arc<FunctionType>>> {
    // let stubbed_runtimes = stubbed_runtimes
    //     .iter()
    //     .map(|rt_name| {
    //         tg.runtimes
    //             .iter()
    //             .position(|rt| rt_name == rt.name())
    //             .map(|idx| (idx as u32, Arc::new(tg.runtimes[idx].clone())))
    //             .with_context(|| format!("runtime {rt_name} not found in typegraph"))
    //     })
    //     .collect::<Result<IndexMap<_, _>, _>>()?;
    // let stubbed_materializers = tg
    //     .materializers
    //     .iter()
    //     .enumerate()
    //     // TODO: consider filtering out non "function" mats
    //     .filter(|(_, mat)| stubbed_runtimes.contains_key(&mat.runtime))
    //     .map(|(id, _)| id as u32)
    //     .collect::<IndexSet<_>>();

    let stubbed_runtimes: HashSet<_> = stubbed_runtimes.iter().map(|t| t.as_str()).collect();

    let stubbed_funcs = tg
        .functions
        .values()
        .filter(|f| stubbed_runtimes.contains(&f.runtime().name()))
        .cloned()
        .collect();

    Ok(stubbed_funcs)
}

pub fn get_gql_type(ty: &Type, as_id: bool, optional: bool) -> Result<String> {
    let name = match ty {
        Type::Optional(ty) => return get_gql_type(ty.item(), false, true),
        Type::List(ty) => get_gql_type(ty.item(), false, true).map(|item| format!("[{}]", item))?,
        Type::String(_ty) => {
            if as_id {
                "ID".into()
            } else {
                "String".into()
            }
        }
        Type::Boolean(_) => "Boolean".into(),
        Type::Float(_) => "Float".into(),
        Type::Integer(_) => "Int".into(),
        ty => ty.base().title.clone(),
    };
    Ok(if !optional { format!("{name}!") } else { name })
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
