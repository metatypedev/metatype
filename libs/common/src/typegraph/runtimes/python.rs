// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModuleMatData {
    pub python_artifact: String,
    pub deps: Vec<String>,
    pub deps_meta: Vec<IndexMap<String, Value>>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PythonRuntimeData {
    pub config: Option<String>, // (pre-commit fails on empty interfaces otherwise)
}
