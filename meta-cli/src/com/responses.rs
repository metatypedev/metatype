use super::store::Command;
use crate::deploy::actors::pusher::PushResultRaw;
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
    #[allow(dead_code)]
    command: Command,
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
        Ok(())
    }

    pub fn as_typegraph(&self) -> Result<Typegraph> {
        self.validate()?;
        let value = self.data.to_owned().unwrap();
        serde_json::from_value(value).map_err(|e| e.into())
    }

    pub fn as_push_result(&self) -> Result<PushResultRaw> {
        match &self.data {
            Some(value) => serde_json::from_value(value.to_owned()).map_err(|e| e.into()),
            None => todo!(),
        }
    }
}
