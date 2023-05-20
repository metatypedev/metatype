// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{Context, Result};
use colored::Colorize;
use indoc::indoc;
use log::{error, info, warn};
use serde::Deserialize;
use serde_json::json;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use common::typegraph::Typegraph;

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
pub struct Migrations {
    pub runtime: String,
    pub migrations: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    name: String,
    messages: Vec<MessageEntry>,
    migrations: Vec<Migrations>,
    reset_required: Vec<String>,
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

    pub fn success(&self) -> bool {
        self.messages
            .iter()
            .all(|m| !matches!(m, MessageEntry::Error(_)))
    }

    pub fn take_migrations(&mut self) -> Vec<Migrations> {
        std::mem::take(&mut self.migrations)
    }

    pub fn reset_required(&self) -> &[String] {
        self.reset_required.as_slice()
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
        let tg = match &self.node.prefix {
            Some(prefix) => tg.with_prefix(prefix)?,
            None => tg.clone(),
        };
        let res = self.node
            .post("/typegate")?
            .gql(
                indoc! {"
                mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
                    addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
                        name
                        messages { type text }
                        migrations { runtime migrations }
                        resetRequired
                    }
                }"}
                .to_string(),
                Some(json!({ "tg": serde_json::to_string(&tg)?, "secrets": serde_json::to_string(&secrets)?, "cliVersion": common::get_version() })),
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
            .and_then(|ids| ids.iter().position(|i| i == &id))
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
