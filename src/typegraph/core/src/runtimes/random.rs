// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    types::{AsTypeDefEx as _, FindAttribute as _, TypeDef, TypeId},
    wit::runtimes as wit,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub enum RandomMaterializer {
    Runtime(wit::MaterializerRandom),
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum RandConfigNode {
    Parent {
        children: IndexMap<String, RandConfigNode>,
    },
    Leaf {
        gen: String,
        args: IndexMap<String, serde_json::Value>,
    },
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Generator {
    pub gen: String,
    #[serde(flatten)]
    pub args: IndexMap<String, serde_json::Value>,
}

pub fn collect_random_runtime_config(out_type: TypeId) -> Result<Option<RandConfigNode>> {
    let xdef = out_type.as_xdef()?;
    let gen = {
        let xdef = &xdef;
        let attr = xdef.attributes.find_runtime_attr("");
        attr.and_then(|attr| serde_json::from_value::<Generator>(attr.clone()).ok())
    };
    // TODO fail if gen is some on parent?
    match xdef.type_def {
        TypeDef::Struct(s) => {
            let mut children = IndexMap::default();
            for (key, type_id) in &s.data.props {
                let child = collect_random_runtime_config(TypeId(*type_id))?;
                if let Some(child) = child {
                    children.insert(key.clone(), child);
                }
            }
            if children.is_empty() {
                Ok(None)
            } else {
                Ok(Some(RandConfigNode::Parent { children }))
            }
        }
        TypeDef::Func(_) => {
            // unmanaged
            Ok(None)
        }
        TypeDef::List(l) => {
            let child = collect_random_runtime_config(TypeId(l.data.of))?;
            if let Some(child) = child {
                let children = IndexMap::from_iter(vec![("_".into(), child)]);
                Ok(Some(RandConfigNode::Parent { children }))
            } else {
                Ok(None)
            }
        }
        TypeDef::Optional(o) => {
            let child = collect_random_runtime_config(TypeId(o.data.of))?;
            if let Some(child) = child {
                let children = IndexMap::from_iter(vec![("_".into(), child)]);
                Ok(Some(RandConfigNode::Parent { children }))
            } else {
                Ok(None)
            }
        }
        TypeDef::Union(u) => {
            let mut children = IndexMap::default();
            for (i, type_id) in u.data.variants.iter().enumerate() {
                let child = collect_random_runtime_config(TypeId(*type_id))?;
                if let Some(child) = child {
                    children.insert(format!("_{i}"), child);
                }
            }
            if children.is_empty() {
                Ok(None)
            } else {
                Ok(Some(RandConfigNode::Parent { children }))
            }
        }
        TypeDef::Either(u) => {
            let mut children = IndexMap::default();
            for (i, type_id) in u.data.variants.iter().enumerate() {
                let child = collect_random_runtime_config(TypeId(*type_id))?;
                if let Some(child) = child {
                    children.insert(format!("_{i}"), child);
                }
            }
            if children.is_empty() {
                Ok(None)
            } else {
                Ok(Some(RandConfigNode::Parent { children }))
            }
        }
        TypeDef::Boolean(_) | TypeDef::Integer(_) | TypeDef::Float(_) | TypeDef::String(_) => {
            Ok(gen.map(|gen| RandConfigNode::Leaf {
                gen: gen.gen,
                args: gen.args,
            }))
        }
        TypeDef::File(_) => Ok(None),
        // _ => Ok(None),
    }
}
