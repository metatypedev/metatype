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
use typegraph::FunctionType;

#[derive(Debug, Clone)]
pub struct FdkTemplate {
    pub entries: IndexMap<&'static str, std::borrow::Cow<'static, str>>,
}

pub fn filter_stubbed_funcs(
    tg: &Typegraph,
    stubbed_runtimes: &[String],
) -> anyhow::Result<Vec<Arc<FunctionType>>> {
    let stubbed_runtimes: HashSet<_> = stubbed_runtimes.iter().map(|t| t.as_str()).collect();

    let stubbed_funcs = tg
        .functions
        .values()
        .filter(|f| stubbed_runtimes.contains(&f.runtime().name()))
        .cloned()
        .collect();

    Ok(stubbed_funcs)
}

pub fn get_gql_type(ty: &Type, as_id: bool, optional: bool) -> String {
    let name = match ty {
        Type::Optional(ty) => return get_gql_type(ty.item(), false, true),
        Type::List(ty) => {
            let item = get_gql_type(ty.item(), false, false);
            format!("[{}]", item)
        }
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
