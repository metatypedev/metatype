// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Artifact {
    pub path: PathBuf,
    pub hash: String,
    pub size: u32,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModuleMatData {
    pub python_artifact: String,
    pub deps: Vec<String>,
    // pub deps_meta: Vec<Artifact>
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PythonRuntimeData {
    pub config: Option<String>, // (pre-commit fails on empty interfaces otherwise)
}
