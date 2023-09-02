// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{PolicyIndices, TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    /// takes already converted runtime id
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode>;
}

#[derive(Default)]
pub struct TypeNodeBaseBuilder {
    name: String,
    runtime: u32,
    enumeration: Option<Vec<String>>,
    policies: Vec<PolicyIndices>,
    runtime_config: Option<Vec<(String, String)>>,
    as_id: bool,
}

/// takes converted runtime id
pub fn gen_base(
    name: String,
    runtime_config: Option<Vec<(String, String)>>,
    runtime_id: u32,
) -> TypeNodeBaseBuilder {
    TypeNodeBaseBuilder {
        name,
        runtime: runtime_id,
        runtime_config,
        ..Default::default()
    }
}

impl TypeNodeBaseBuilder {
    pub fn build(self) -> TypeNodeBase {
        let mut config: Option<IndexMap<String, serde_json::Value>> = None;
        if let Some(cfg_list) = self.runtime_config {
            let mut map = IndexMap::new();
            for (k, v) in cfg_list.iter() {
                map.insert(k.to_string(), serde_json::from_str(v).unwrap());
            }
            config = Some(map);
        }
        TypeNodeBase {
            config: config.unwrap_or(Default::default()),
            description: None,
            enumeration: self.enumeration,
            injection: None,
            policies: self.policies,
            runtime: self.runtime,
            title: self.name,
            as_id: self.as_id,
        }
    }

    pub fn enum_(mut self, enumeration: Option<Vec<String>>) -> Self {
        self.enumeration = enumeration;
        self
    }

    pub fn as_id(mut self, b: bool) -> Self {
        self.as_id = b;
        self
    }
}

// /// takes converted runtime id
// pub fn gen_base(
//     name: String,
//     runtime_config: Option<Vec<(String, String)>>,
//     runtime_id: u32,
//     enumeration: Option<Vec<String>>,
// ) -> TypeNodeBase {
//     let mut config: Option<IndexMap<String, serde_json::Value>> = None;
//     if let Some(cfg_list) = runtime_config {
//         let mut map = IndexMap::new();
//         for (k, v) in cfg_list.iter() {
//             map.insert(k.to_string(), serde_json::from_str(v).unwrap());
//         }
//         config = Some(map);
//     }
//     TypeNodeBase {
//         config: config.unwrap_or(Default::default()),
//         description: None,
//         enumeration,
//         injection: None,
//         policies: Vec::new(),
//         runtime: runtime_id,
//         title: name,
//         as_id: false,
//     }
// }
