// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{anyhow, Context, Result};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionMatData {
    pub script: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Hash, PartialEq, Eq)]
#[serde(tag = "type", content = "value")]
#[serde(rename_all = "snake_case")]
pub enum ContextCheckX {
    NotNull,
    Value(String),
    Pattern(String),
}

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
#[serde(tag = "name", content = "param")]
pub enum PredefinedFunctionMatData {
    Identity,
    True,
    False,
    Allow,
    Deny,
    Pass,
    InternalPolicy,
    ContextCheck { key: String, value: ContextCheckX },
}

#[derive(Serialize)]
struct PredefinedFunctionMatDataRaw {
    name: String,
    param: Option<Value>,
}

impl PredefinedFunctionMatData {
    pub fn from_raw(name: String, param: Option<String>) -> Result<Self> {
        let param = param
            .map(|p| serde_json::from_str(&p))
            .transpose()
            .context("invalid predefined function materializer parameter")?;
        let value = serde_json::to_value(&PredefinedFunctionMatDataRaw { name, param })?;
        serde_json::from_value(value)
            .map_err(|e| anyhow!("invalid predefined function materializer: {e:?}"))
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMatData {
    pub entry_point: PathBuf,
    pub deps: Vec<PathBuf>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DenoRuntimeData {
    pub worker: String,
    pub permissions: IndexMap<String, Value>,
}
