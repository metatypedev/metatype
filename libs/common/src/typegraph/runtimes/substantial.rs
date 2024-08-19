// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SubstantialRuntimeData {
    pub endpoint: String,
    pub basic_auth_secret: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum WorkflowKind {
    Python,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkflowMatData {
    pub name: String,
    pub file: String,
    pub kind: WorkflowKind,
    pub deps: Vec<PathBuf>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMatData {
    pub entry_point: PathBuf,
    pub deps: Vec<PathBuf>,
}

impl From<WorkflowMatData> for ModuleMatData {
    fn from(value: WorkflowMatData) -> Self {
        Self {
            entry_point: PathBuf::from(value.file),
            deps: value.deps,
        }
    }
}
