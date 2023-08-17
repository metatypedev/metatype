// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode>;
}

pub fn gen_base(name: String) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration: None,
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
        as_id: false,
    }
}

pub fn gen_base_enum(
    name: String,
    runtime_config: Option<Vec<(String, String)>>,
    enumeration: Option<Vec<String>>,
) -> TypeNodeBase {
    let mut config: Option<IndexMap<String, serde_json::Value>> = None;
    if let Some(cfg_list) = runtime_config {
        let mut map = IndexMap::new();
        for (k, v) in cfg_list.iter() {
            map.insert(k.to_string(), serde_json::Value::String(v.to_string()));
        }
        config = Some(map);
    }

    TypeNodeBase {
        config: config.unwrap_or(Default::default()),
        description: None,
        enumeration,
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
        as_id: false,
    }
}
