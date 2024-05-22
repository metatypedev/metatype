// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use super::store::Command;
use crate::{codegen::deno::Codegen, deploy::push::pusher::PushResultRaw};
use common::typegraph::Typegraph;
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

impl SDKResponse {
    pub fn validate(&self) -> Result<()> {
        if self.data.is_none() && self.error.is_none() {
            // This should never happen
            // maybe use panic instead?
            bail!(
                "typegraph {:?} provided an invalid response, data and error fields are both undefined",
                self.typegraph_name
            );
        }

        if let Some(error) = self.error.clone() {
            let err: SDKError = serde_json::from_value(error)?;
            bail!(
                "SDK {} error: {}",
                err.code.strip_suffix("_err").unwrap_or(&err.code),
                err.msg
            );
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
        if let Some(errors) = response.errors {
            if errors.len() == 1 {
                bail!(
                    "error response when pushing to typegate: {}",
                    errors[0].message
                )
            } else {
                let mut err = ferr!("error responses when pushing to typegate");
                for error in errors {
                    err = err.section(error.message);
                }
                return Err(err);
            }
        }
        let field = "addTypegraph";
        let Some(data) = &response.data else {
            bail!("unexpected response when pushing to typegate: has no field 'data'")
        };
        let value = &data[field];
        if value.is_null() {
            bail!("unexpected response when pushing to typegate: has no field 'data.{field}'")
        }
        Ok(serde_json::from_value(value.clone())?)
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
