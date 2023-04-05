// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::PathBuf;

use anyhow::{bail, Result};
use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::skip_serializing_none;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Debug)]
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
#[derive(Serialize, Deserialize, Debug)]
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
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum AuthProtocol {
    OAuth2,
    Jwt,
    Basic,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Debug)]
pub struct Auth {
    pub name: String,
    pub protocol: AuthProtocol,
    pub auth_data: IndexMap<String, Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Debug)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Debug)]
pub struct TypeMeta {
    pub secrets: Vec<String>,
    pub cors: Cors,
    pub auths: Vec<Auth>,
    pub rate: Option<Rate>,
    pub version: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
pub struct TypeNodeBase {
    pub title: String,
    pub runtime: u32,
    pub policies: Vec<PolicyIndices>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub injection: Option<String>,
    #[serde(default, skip_serializing_if = "serde_json::Value::is_null")]
    pub inject: Value,
    #[serde(default, rename = "enum")]
    pub enumeration: Option<Vec<Value>>,
    #[serde(default)]
    pub config: IndexMap<String, serde_json::Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TypeNode {
    Optional {
        #[serde(flatten)]
        base: TypeNodeBase,
        item: u32,
        #[serialize_always]
        default_value: Option<serde_json::Value>,
    },
    Boolean {
        #[serde(flatten)]
        base: TypeNodeBase,
    },
    #[serde(rename_all = "camelCase")]
    Number {
        #[serde(flatten)]
        base: TypeNodeBase,
        minimum: Option<f64>,
        maximum: Option<f64>,
        exclusive_minimum: Option<f64>,
        exclusive_maximum: Option<f64>,
        multiple_of: Option<f64>,
    },
    #[serde(rename_all = "camelCase")]
    Integer {
        #[serde(flatten)]
        base: TypeNodeBase,
        minimum: Option<i64>,
        maximum: Option<i64>,
        exclusive_minimum: Option<i64>,
        exclusive_maximum: Option<i64>,
        multiple_of: Option<i64>,
    },
    #[serde(rename_all = "camelCase")]
    String {
        #[serde(flatten)]
        base: TypeNodeBase,
        min_length: Option<i64>,
        max_length: Option<i64>,
        pattern: Option<String>,
        format: Option<String>,
    },
    Object {
        #[serde(flatten)]
        base: TypeNodeBase,
        properties: IndexMap<String, u32>,
        #[serde(default)]
        required: Vec<String>,
    },
    #[serde(rename_all = "camelCase")]
    Array {
        #[serde(flatten)]
        base: TypeNodeBase,
        items: u32,
        max_items: Option<u32>,
        min_items: Option<u32>,
        unique_items: Option<bool>,
    },
    Function {
        #[serde(flatten)]
        base: TypeNodeBase,
        input: u32,
        output: u32,
        materializer: u32,
        #[serialize_always]
        rate_weight: Option<u32>,
        rate_calls: bool,
    },
    #[serde(rename_all = "camelCase")]
    Union {
        #[serde(flatten)]
        base: TypeNodeBase,
        /// Array of indexes of the nodes that are used as subschemes in the
        /// anyOf field of JSON Schema.
        any_of: Vec<u32>,
    },
    #[serde(rename_all = "camelCase")]
    Either {
        #[serde(flatten)]
        base: TypeNodeBase,
        /// Array of indexes of the nodes that are used as subschemes in the
        /// oneOf field of JSON Schema.
        one_of: Vec<u32>,
    },
    Any {
        #[serde(flatten)]
        base: TypeNodeBase,
    },
}

impl TypeNode {
    pub fn base(&self) -> &TypeNodeBase {
        use TypeNode::*;
        match self {
            Optional { base, .. }
            | Boolean { base, .. }
            | Number { base, .. }
            | Integer { base, .. }
            | String { base, .. }
            | Object { base, .. }
            | Array { base, .. }
            | Function { base, .. }
            | Union { base, .. }
            | Either { base, .. }
            | Any { base, .. } => base,
        }
    }
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum EffectType {
    Create,
    Update,
    Upsert,
    Delete,
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
#[derive(Serialize, Deserialize, Debug)]
pub struct TGRuntime {
    pub name: String,
    pub data: IndexMap<String, Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Debug)]
pub struct Policy {
    pub name: String,
    pub materializer: u32,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
pub struct PolicyIndicesByEffect {
    pub none: Option<u32>,
    pub create: Option<u32>,
    pub delete: Option<u32>,
    pub update: Option<u32>,
    pub upsert: Option<u32>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum PolicyIndices {
    Policy(u32),
    EffectPolicies(PolicyIndicesByEffect),
}

impl Typegraph {
    pub fn name(&self) -> Result<String> {
        let root_type = &self.types[0];
        match root_type {
            TypeNode::Object { base, .. } => Ok(base.title.clone()),
            _ => bail!("invalid variant for root type"),
        }
    }
}

impl TypeNode {
    pub fn get_struct_fields(&self) -> Result<IndexMap<String, u32>> {
        if let TypeNode::Object { properties, .. } = &self {
            Ok(properties.clone())
        } else {
            bail!("node is not an object variant, found: {self:#?}")
        }
    }
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize)]
pub struct FunctionMatData {
    pub script: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleMatData {
    pub code: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub datamodel: String,
    pub connection_string_secret: String,
    pub models: Vec<u32>,
    pub migrations: Option<String>,
    #[serde(default)]
    pub create_migration: bool,
}
