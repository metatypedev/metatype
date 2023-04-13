// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use colored::Colorize;
use indoc::indoc;
use log::{error, info, warn};
use serde::Deserialize;
use serde_json::json;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};

use common::typegraph::Typegraph;
use tokio::{
    sync::{
        mpsc::{self, UnboundedReceiver, UnboundedSender},
        Mutex,
    },
    time::sleep,
};

use crate::utils::{graphql::Query, Node};

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
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    name: String,
    custom_data: String,
    messages: Vec<MessageEntry>,
    #[serde(skip)]
    pub path: Option<PathBuf>,
}

impl PushResult {
    pub fn print_messages(&self) {
        let name = self.name.blue();
        for msg in self.messages.iter() {
            match msg {
                MessageEntry::Info(txt) => {
                    info!("[{name}] {txt}");
                }
                MessageEntry::Warning(txt) => {
                    warn!("[{name}] {txt}");
                }
                MessageEntry::Error(txt) => {
                    error!("[{name}] {txt}");
                }
            }
        }
    }

    pub fn tg_name(&self) -> &str {
        &self.name
    }

    pub fn should_retry(&self) -> bool {
        let res = serde_json::from_str::<HashMap<String, serde_json::Value>>(&self.custom_data);
        res.map(|data| {
            data.get("retry")
                .map(|v| matches!(v, serde_json::Value::Bool(true)))
                .unwrap_or(false)
        })
        .unwrap_or(false)
    }

    pub fn iter_custom_data(&self) -> Result<impl Iterator<Item = (String, serde_json::Value)>> {
        let map: HashMap<String, serde_json::Value> = serde_json::from_str(&self.custom_data)?;
        Ok(map.into_iter().map(|(k, v)| (k, v)))
    }

    pub fn has_error(&self) -> bool {
        return self
            .messages
            .iter()
            .any(|m| matches!(m, MessageEntry::Error(_)));
    }
}

pub struct PushConfig {
    node: Node,
    base_dir: PathBuf,
}

impl PushConfig {
    pub fn new(node: Node, base_dir: PathBuf) -> Self {
        Self { node, base_dir }
    }

    pub async fn push(&self, tg: &Typegraph) -> Result<PushResult> {
        let secrets = lade_sdk::hydrate(self.node.env.clone(), self.base_dir.clone()).await?;
        let res = self.node
            .post("/typegate")?
            .gql(
                indoc! {"
                mutation InsertTypegraph($tg: String!, $secrets: String!) {
                    addTypegraph(fromString: $tg, secrets: $secrets) {
                        name
                        messages { type text }
                        customData
                    }
                }"}
                .to_string(),
                Some(json!({ "tg": serde_json::to_string(tg)?, "secrets": serde_json::to_string(&secrets)? })),
            )
            .await?;

        res.data("addTypegraph")
            .context("addTypegraph field in the response")
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RetryId(u32);

impl RetryId {
    pub fn as_u32(&self) -> u32 {
        self.0
    }
}

#[derive(Default)]
pub struct RetryManager {
    latest_id: u32,
    cancelled_retries: Vec<RetryId>,
    retry_paths: HashMap<PathBuf, Vec<RetryId>>,
}

pub enum RetryState {
    Cancelled,
    Valid,
}

impl RetryManager {
    pub fn add(&mut self, path: PathBuf) -> RetryId {
        self.latest_id += 1;
        let id = RetryId(self.latest_id);
        self.retry_paths.entry(path).or_default().push(id);
        id
    }

    pub fn remove(&mut self, id: RetryId, path: &Path) -> Option<RetryState> {
        let same_path = self.retry_paths.get_mut(path);
        if let Some(pos) = same_path
            .as_ref()
            .map(|ids| ids.iter().position(|i| i == &id))
            .flatten()
        {
            same_path.unwrap().swap_remove(pos);
            Some(RetryState::Valid)
        } else if let Some(pos) = self.cancelled_retries.iter().position(|i| i == &id) {
            self.cancelled_retries.swap_remove(pos);
            Some(RetryState::Cancelled)
        } else {
            None
        }
    }

    pub fn cancell_all(&mut self, path: &Path) {
        if let Some(ids) = self.retry_paths.remove(path) {
            for id in ids {
                self.cancelled_retries.push(id)
            }
        }
    }
}
