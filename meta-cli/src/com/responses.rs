// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use super::store::Command;
use serde_json::Value;

// CLI => SDK

#[derive(Serialize)]
pub struct CLIResponseSuccess {
    pub data: Value,
}

#[derive(Serialize)]
pub struct CLIResponseError {
    pub error: String,
}

// SDK => CLI

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SDKResponse {
    pub command: Command,
    pub typegraph_name: String,
    pub typegraph_path: PathBuf,
    /// Payload from the SDK (serialized typegraph, response from typegate)
    pub data: Option<serde_json::Value>,
    pub error: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SDKError {
    code: String,
    msg: String,
    #[allow(unused)]
    value: serde_json::Value,
}
