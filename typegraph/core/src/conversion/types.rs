// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    /// takes already converted runtime id
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode>;
}

/// takes converted runtime id
pub fn gen_base(
    name: String,
    runtime_config: Option<Vec<(String, String)>>,
    runtime_id: u32,
    enumeration: Option<Vec<String>>,
) -> TypeNodeBase {
    let mut config: Option<IndexMap<String, serde_json::Value>> = None;
    if let Some(cfg_list) = runtime_config {
        let mut map = IndexMap::new();
        for (k, v) in cfg_list.iter() {
            map.insert(k.to_string(), serde_json::from_str(v).unwrap());
        }
        config = Some(map);
    }
    TypeNodeBase {
        config: config.unwrap_or(Default::default()),
        description: None,
        enumeration,
        injection: None,
        policies: Vec::new(),
        runtime: runtime_id,
        title: name,
        as_id: false,
    }
}
