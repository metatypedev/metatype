// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Info,
    Warning,
    Error,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case", tag = "type", content = "text")]
pub enum MessageEntry {
    Info(String),
    Warning(String),
    Error(String),
}

#[derive(Deserialize, Debug)]
pub struct Migrations {
    pub runtime: String,
    pub migrations: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    pub messages: Vec<MessageEntry>,
    #[serde(skip)]
    pub original_name: Option<String>,
}
