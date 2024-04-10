// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::store::Command;
use crate::{codegen::deno::Codegen, deploy::push::pusher::PushResultRaw};
use anyhow::{bail, Result};
use common::typegraph::Typegraph;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

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

impl SDKResponse {
    pub fn validate(&self) -> Result<()> {
        if self.data.is_none() && self.error.is_none() {
            // This should never happen
            // maybe use panic instead?
            bail!(
                "Typegraph {:?} provided an invalid response, data and error fields are both undefined",
                self.typegraph_name
            );
        }

        if let Some(error) = self.error.clone() {
            let err: String = serde_json::from_value(error)?;
            bail!(err);
        }

        Ok(())
    }

    pub fn as_typegraph(&self) -> Result<Typegraph> {
        self.validate()?;
        let value = self.data.to_owned().unwrap();
        serde_json::from_value(value).map_err(|e| e.into())
    }

    pub fn as_push_result(&self) -> Result<PushResultRaw> {
        self.validate()?;
        let response: common::graphql::Response =
            serde_json::from_value(self.data.clone().unwrap())?;
        response.data("addTypegraph")
    }

    pub fn typegraph_dir(&self) -> PathBuf {
        let mut ret = self.typegraph_path.clone();
        ret.pop(); // pop file.ext
        ret
    }

    pub fn codegen(&self) -> Result<()> {
        let tg = self.as_typegraph()?;
        let path = self.typegraph_path.clone();
        Codegen::new(&tg, &path).apply_codegen()
    }
}
