// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod runtimes;
pub mod types;
pub mod validator;
pub mod visitor;

pub use types::*;

use std::path::PathBuf;

use anyhow::{bail, Result};
use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::skip_serializing_none;

use self::runtimes::TGRuntime;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Typegraph {
    #[serde(rename = "$id")]
    pub id: String,
    pub types: Vec<TypeNode>,
    pub materializers: Vec<Materializer>,
    pub runtimes: Vec<TGRuntime>,
    pub policies: Vec<Policy>,
    pub meta: TypeMeta,
    #[serde(skip)]
    pub path: Option<PathBuf>,
    #[serde(skip)]
    pub deps: Vec<PathBuf>,
    pub prefix: Option<String>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
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

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum AuthProtocol {
    OAuth2,
    Jwt,
    Basic,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Auth {
    pub name: String,
    pub protocol: AuthProtocol,
    pub auth_data: IndexMap<String, Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TypeMeta {
    pub secrets: Vec<String>,
    pub cors: Cors,
    pub auths: Vec<Auth>,
    pub rate: Option<Rate>,
    pub version: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "lowercase")]
pub enum EffectType {
    Create,
    Update,
    Delete,
    None,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Effect {
    pub effect: Option<EffectType>,
    pub idempotent: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Materializer {
    pub name: String,
    pub runtime: u32,
    pub effect: Effect,
    pub data: IndexMap<String, Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Policy {
    pub name: String,
    pub materializer: u32,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PolicyIndicesByEffect {
    pub none: Option<u32>,
    pub create: Option<u32>,
    pub delete: Option<u32>,
    pub update: Option<u32>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
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
            self.prefix.as_deref().unwrap_or(""),
            self.name()?
        ))
    }

    pub fn with_prefix(&self, prefix: String) -> Result<Self> {
        let mut tg = self.clone();
        tg.prefix = Some(prefix);
        Ok(tg)
    }
}

impl TypeNode {
    pub fn get_struct_fields(&self) -> Result<IndexMap<String, u32>> {
        if let TypeNode::Object { data, .. } = &self {
            Ok(data.properties.clone())
        } else {
            bail!("node is not an object variant, found: {self:#?}")
        }
    }
}
