// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RedisConfig {
    pub connection_string: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase", tag = "type")]
pub enum SubstantialBackend {
    Fs,
    Memory,
    Redis(RedisConfig),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SubstantialRuntimeData {
    pub backend: SubstantialBackend,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum WorkflowKind {
    Python,
    Deno,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkflowMatData {
    pub name: String,
    pub file: PathBuf,
    pub kind: WorkflowKind,
    pub deps: Vec<PathBuf>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMatData {
    pub entry_point: PathBuf,
    pub deps: Vec<PathBuf>,
}

impl SubstantialBackend {
    pub fn as_key(&self) -> String {
        // Note: be wary of non-deterministic types
        serde_json::to_string(&self).unwrap()
    }
}
