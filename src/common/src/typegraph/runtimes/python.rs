// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMatData {
    pub entry_point: PathBuf,
    pub deps: Vec<PathBuf>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PythonRuntimeData {
    pub config: Option<String>, // (pre-commit fails on empty interfaces otherwise)
}
