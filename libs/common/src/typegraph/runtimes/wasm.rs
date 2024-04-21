// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WasmMatData {
    pub wasm: String,
    pub func: String,
    pub artifact_hash: String,
    pub tg_name: Option<String>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WasmRuntimeData {
    pub config: Option<String>, // placeholder (pre-commit fails on empty interfaces otherwise)
}
