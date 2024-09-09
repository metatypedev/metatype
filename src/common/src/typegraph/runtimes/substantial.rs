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
