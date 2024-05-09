// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionMatData {
    pub script: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMatData {
    pub deno_artifact: IndexMap<String, Value>,
    pub deps: Vec<String>,
    pub deps_meta: Option<Vec<IndexMap<String, Value>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DenoRuntimeData {
    pub worker: String,
    pub permissions: IndexMap<String, Value>,
}
