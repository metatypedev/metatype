// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
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
#[derive(Serialize, Deserialize, Clone, Debug)]
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
    Upsert,
    Delete,
    None,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Effect {
    effect: Option<EffectType>,
    idempotent: bool,
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
pub struct TGRuntime {
    pub name: String,
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
    pub upsert: Option<u32>,
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

    pub fn with_prefix(&self, prefix: &String) -> Result<Self> {
        match &self.types[0] {
            TypeNode::Object { base, data } => {
                let new_type = TypeNode::Object {
                    base: TypeNodeBase {
                        title: format!("{}{}", prefix, base.title),
                        ..base.clone()
                    },
                    data: data.clone(),
                };
                let mut tg = self.clone();
                tg.types[0] = new_type;
                Ok(tg)
            }
            _ => bail!("invalid variant for root type"),
        }
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

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionMatData {
    pub script: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModuleMatData {
    pub code: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MigrationOptions {
    pub migration_files: Option<String>,
    // enable migration creation
    // otherwise, a non-empty diff will make the push fail
    pub create: bool,
    // reset the database if required
    pub reset: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub datamodel: String,
    pub connection_string_secret: String,
    pub models: Vec<u32>,
    // if migration_options is not None: migrations will be applied on push
    #[serde(default)]
    pub migration_options: Option<MigrationOptions>,
}
