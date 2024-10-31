// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionMatData {
    pub script: String,
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
