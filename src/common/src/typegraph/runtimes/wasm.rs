// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
