// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::skip_serializing_none;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct Typegraph {
    pub types: Vec<TypeNode>,
    #[serde(default)]
    pub materializers: Vec<Materializer>,
    pub runtimes: Vec<TGRuntime>,
    #[serde(default)]
    pub policies: Vec<Policy>,
    pub meta: TypeMeta,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub allow_credentials: bool,
    pub max_age: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Auth {
    pub name: String,
    pub protocol: String,
    pub auth_data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TypeMeta {
    pub secrets: Vec<String>,
    pub cors: Cors,
    pub auths: Vec<Auth>,
    pub rate: Option<Rate>,
    pub version: String,
}

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Debug)]
pub struct TypeNodeBase {
    pub title: String,
    pub runtime: u32,
    pub policies: Vec<u32>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub injection: Option<String>,
    #[serde(default)]
    pub inject: Option<serde_json::Value>,
    #[serde(default, rename = "enum")]
    pub enum_: Option<Vec<serde_json::Value>>,
    #[serde(default)]
    pub config: HashMap<String, serde_json::Value>,
}

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
        properties: HashMap<String, u32>,
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
            | Any { base, .. } => base,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Materializer {
    pub name: String,
    pub runtime: u32,
    pub data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TGRuntime {
    pub name: String,
    pub data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Policy {
    pub name: String,
    pub materializer: u32,
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
    pub fn get_struct_fields(&self) -> Result<HashMap<String, u32>> {
        if let TypeNode::Object { properties, .. } = &self {
            Ok(properties.clone())
        } else {
            bail!("node is not an object variant")
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct FunctionMatData {
    pub script: String,
    serial: bool,
}

#[derive(Serialize, Deserialize)]
pub struct ModuleMatData {
    pub code: String,
    serial: bool,
}
