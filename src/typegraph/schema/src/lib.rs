// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod parameter_transform;
pub mod runtimes;
pub mod types;
pub mod utils;
pub mod validator;
pub mod visitor;
pub mod visitor2;

pub use types::*;

use std::collections::BTreeMap;
use std::hash::Hash;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{bail, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::skip_serializing_none;

use self::runtimes::Artifact;
use self::runtimes::TGRuntime;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Typegraph {
    pub types: Vec<TypeNode>,
    pub materializers: Vec<Materializer>,
    pub runtimes: Vec<TGRuntime>,
    pub policies: Vec<Policy>,
    pub meta: TypeMeta,

    // TODO: factor out non-essential fields into a separate struct
    #[serde(skip)]
    pub path: Option<Arc<Path>>,
    #[serde(skip)]
    pub deps: Vec<PathBuf>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    #[serde(default)]
    pub allow_methods: Vec<String>,
    pub allow_credentials: bool,
    pub max_age_sec: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum AuthProtocol {
    OAuth2,
    Jwt,
    Basic,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Auth {
    pub name: String,
    pub protocol: AuthProtocol,
    pub auth_data: IndexMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

// TODO: remove default, as they should all be explicity set in the core SDK
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Queries {
    pub dynamic: bool,
    pub endpoints: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct TypeMeta {
    pub prefix: Option<String>,
    pub secrets: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[serde(default)]
    pub outjection_secrets: Vec<String>,
    pub queries: Queries,
    pub cors: Cors,
    pub auths: Vec<Auth>,
    pub rate: Option<Rate>,
    pub version: String,
    pub random_seed: Option<u32>,
    pub artifacts: BTreeMap<PathBuf, Artifact>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[serde(default)]
    pub namespaces: Vec<u32>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum EffectType {
    Create,
    Update,
    Delete,
    Read,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Effect {
    pub effect: Option<EffectType>,
    pub idempotent: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Materializer {
    pub name: String,
    pub runtime: u32,
    pub effect: Effect,
    pub data: IndexMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Policy {
    pub name: String,
    pub materializer: u32,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
pub struct PolicyIndicesByEffect {
    pub read: Option<u32>,
    pub create: Option<u32>,
    pub delete: Option<u32>,
    pub update: Option<u32>,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug, Hash)]
#[serde(untagged)]
pub enum PolicyIndices {
    Policy(u32),
    EffectPolicies(PolicyIndicesByEffect),
}

impl Typegraph {
    pub fn name(&self) -> Result<String> {
        match &self.types[0] {
            TypeNode::Object { base, .. } => Ok(base.title.clone()),
            _ => bail!("invalid variant for root type"),
        }
    }

    pub fn full_name(&self) -> Result<String> {
        Ok(format!(
            "{}{}",
            self.meta.prefix.as_deref().unwrap_or(""),
            self.name()?
        ))
    }

    pub fn with_prefix(&self, prefix: String) -> Result<Self> {
        let mut tg = self.clone();
        tg.meta.prefix = Some(prefix);
        Ok(tg)
    }

    pub fn get_key(&self) -> Result<String> {
        let path = self.get_path()?;
        Ok(format!("{}#{}", path, self.name()?))
    }

    pub fn get_path(&self) -> Result<String> {
        let path = self
            .path
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("typegraph path not set, cannot get id"))?
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("typegraph path is not valid unicode"))?
            .to_owned();
        Ok(path)
    }

    pub fn root(&self) -> Result<(&TypeNodeBase, &ObjectTypeData)> {
        if self.types.is_empty() {
            bail!("typegraph is empty: no nodes found");
        }
        let root = &self.types[0];
        match root {
            TypeNode::Object { base, data } => Ok((base, data)),
            _ => bail!("typegraph is invalid: root node is not object"),
        }
    }

    pub fn resolve_quant(&self, type_idx: TypeId) -> TypeId {
        let mut type_idx = type_idx;
        loop {
            match &self.types[type_idx as usize] {
                TypeNode::Optional { data, .. } => {
                    type_idx = data.item;
                }
                TypeNode::List { data, .. } => {
                    type_idx = data.items;
                }
                _ => break,
            }
        }
        type_idx
    }

    pub fn is_composite(&self, idx: u32) -> bool {
        let node = &self.types[idx as usize];
        use TypeNode as N;
        match node {
            N::Boolean { .. }
            | N::Integer { .. }
            | N::Float { .. }
            | N::String { .. }
            | N::File { .. } => false,
            N::Object { .. } => true,
            N::Optional { data, .. } => self.is_composite(data.item),
            N::List { data, .. } => self.is_composite(data.items),
            N::Union {
                data: UnionTypeData { any_of: variants },
                ..
            }
            | N::Either {
                data: EitherTypeData { one_of: variants },
                ..
            } => {
                for v in variants.iter() {
                    if self.is_composite(*v) {
                        return true;
                    }
                }
                false
            }
            N::Function { data, .. } => self.is_composite(data.output),
            N::Any { .. } => unimplemented!("Any type support not implemented"),
        }
    }

    pub fn is_function(&self, idx: u32) -> bool {
        matches!(&self.types[idx as usize], TypeNode::Function { .. })
    }
}
