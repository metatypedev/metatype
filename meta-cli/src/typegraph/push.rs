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

#[derive(Default)]
struct CancelStates {
    ids: HashMap<PathBuf, Vec<usize>>,
    states: HashMap<usize, bool>,
    next_id: usize,
}

impl CancelStates {
    fn add(&mut self, path: &Path) -> usize {
        let id = self.next_id;
        self.next_id += 1;
        let ids = if let Some(ids) = self.ids.get_mut(path) {
            ids
        } else {
            self.ids.insert(path.to_owned(), vec![]);
            self.ids.get_mut(path).unwrap()
        };
        ids.push(id);
        self.states.insert(id, false);
        id
    }

    fn cancel(&mut self, path: &Path) {
        for id in self.ids.get(path).map(|v| v.iter()).into_iter().flatten() {
            self.states.insert(*id, true);
        }
    }

    fn remove(&mut self, id: usize, path: &Path) -> bool {
        let ids = self.ids.get_mut(path).unwrap();
        if ids.len() == 1 {
            assert!(ids[0] == id);
            self.ids.remove(path).unwrap();
        } else {
            let idx = ids.iter().position(|i| i == &id).unwrap();
            ids.remove(idx);
        };
        self.states.remove(&id).unwrap()
    }
}

pub struct DelayedPushQueue {
    cancel_states: Arc<Mutex<CancelStates>>,
    next_cancellation_id: usize,
    tx: UnboundedSender<(Typegraph, u32)>,
    rx: UnboundedReceiver<(Typegraph, u32)>,
}

impl DelayedPushQueue {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        Self {
            cancel_states: Arc::new(Mutex::new(Default::default())),
            next_cancellation_id: 0,
            tx,
            rx,
        }
    }

    pub async fn delayed_push(&mut self, typegraph: Typegraph, retry_no: u32, delay: Duration) {
        let path = typegraph.path.as_ref().unwrap().to_owned();
        let cancellation_id = self.cancel_states.lock().await.add(&path);
        let cancel_states = Arc::clone(&self.cancel_states);
        let tx = self.tx.clone();
        tokio::task::spawn(async move {
            sleep(delay).await;
            if !cancel_states.lock().await.remove(cancellation_id, &path) {
                // not cancelled
                tx.send((typegraph, retry_no));
            }
        });
    }

    pub async fn next(&mut self) -> Option<(Typegraph, u32)> {
        self.rx.recv().await
    }
}
