// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WasmMatData {
    pub op_name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WasmRuntimeData {
    pub wasm_artifact: PathBuf,
}
