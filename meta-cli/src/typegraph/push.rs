// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use colored::Colorize;
use indoc::indoc;
use log::{error, info, warn};
use pathdiff::diff_paths;
use serde::Deserialize;
use serde_json::json;
use std::{collections::HashMap, path::PathBuf, sync::Arc, time::Duration};

use common::typegraph::Typegraph;
use tokio::{
    sync::mpsc::{error::TryRecvError, unbounded_channel, UnboundedReceiver, UnboundedSender},
    task::JoinHandle,
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

#[derive(Debug)]
pub struct PushQueueEntry {
    typegraph: Typegraph,
    retry_no: u32, //
}

impl PushQueueEntry {
    pub fn new(typegraph: Typegraph) -> Self {
        Self {
            typegraph,
            retry_no: 0,
        }
    }

    async fn push(&self, node: &Node, base: PathBuf) -> Result<PushResult> {
        let tg = &self.typegraph;
        let secrets = lade_sdk::hydrate(node.env.clone(), base).await?;
        let res = node
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

#[derive(Clone, Debug)]
struct Retry {
    max: u32,
    interval: Duration,
}

pub struct DefaultPushResultConsumer;

pub struct PushLoopBuilder<C = DefaultPushResultConsumer>
where
    C: Send + Sized + 'static,
{
    exit: bool, // exit when the queue is empty
    retry: Option<Retry>,
    node: Node,
    base_dir: PathBuf,
    on_pushed: C,
}

impl PushLoopBuilder<DefaultPushResultConsumer> {
    pub fn on(node: Node, base_dir: PathBuf) -> Self {
        Self {
            exit: false,
            retry: None,
            node,
            base_dir,
            on_pushed: DefaultPushResultConsumer,
        }
    }

    pub fn on_pushed<C: Fn(PushResult) + Send + 'static>(self, handler: C) -> PushLoopBuilder<C> {
        PushLoopBuilder {
            exit: self.exit,
            retry: self.retry,
            node: self.node,
            base_dir: self.base_dir,
            on_pushed: handler,
        }
    }
}

impl<C> PushLoopBuilder<C>
where
    C: Send + Sync + Sized + 'static,
{
    pub fn exit(mut self, exit: bool) -> Self {
        self.exit = exit;
        self
    }

    pub fn retry(mut self, max_retries: u32, interval: Duration) -> Self {
        self.retry = Some(Retry {
            max: max_retries,
            interval,
        });
        self
    }

    pub fn start_with(self, push_entries: impl Iterator<Item = PushQueueEntry>) -> Result<PushLoop>
    where
        PushLoopInternal<C>: HandlePushResult,
    {
        let (sender, receiver) = unbounded_channel();

        for entry in push_entries {
            sender.send(entry)?;
        }

        let options = Arc::new(self);
        let sender_1 = sender.clone();

        let join_handle = tokio::spawn(async move {
            PushLoopInternal {
                receiver,
                sender: sender_1,
                pending_retries: 0,
                options,
            }
            .start()
            .await
        });

        Ok(PushLoop {
            join_handle,
            sender,
        })
    }

    pub fn start(self) -> Result<PushLoop>
    where
        PushLoopInternal<C>: HandlePushResult,
    {
        self.start_with(std::iter::empty())
    }
}

pub trait HandlePushResult {
    fn handle_push_result(&self, res: PushResult);
}

impl HandlePushResult for PushLoopInternal<DefaultPushResultConsumer> {
    fn handle_push_result(&self, res: PushResult) {
        res.print_messages();
    }
}

impl<C> HandlePushResult for PushLoopInternal<C>
where
    C: Fn(PushResult) + Sync + Send + 'static,
{
    fn handle_push_result(&self, res: PushResult) {
        (self.options.on_pushed)(res);
    }
}

pub struct PushLoopInternal<C: Send + Sync + 'static> {
    receiver: UnboundedReceiver<PushQueueEntry>,
    sender: UnboundedSender<PushQueueEntry>,
    pending_retries: u32, // number of entry that will be pushed for retry
    options: Arc<PushLoopBuilder<C>>,
}

impl<C> PushLoopInternal<C>
where
    C: Send + Sync + 'static,
    PushLoopInternal<C>: HandlePushResult,
{
    async fn start(&mut self) -> Result<()>
    where
        Self: HandlePushResult,
    {
        loop {
            let Some(entry) = self.next().await? else {
                // exit loop
                break Ok(());
            };

            if entry.retry_no > 0 {
                self.pending_retries -= 1;
            }

            let tg_name = entry.typegraph.name().unwrap().blue();
            let path = entry.typegraph.path.as_ref().unwrap();
            // ? display path relative to current dir or to the metatype.yaml dir??
            info!(
                "Pushing typegraph {tg_name} from {:?}...",
                diff_paths(path, std::env::current_dir().unwrap()).unwrap()
            );
            let options = Arc::clone(&self.options);
            match entry
                .push(&self.options.node, self.options.base_dir.clone())
                .await
            {
                Err(e) => {
                    error!(
                        "{} Failed to push typegraph {tg_name}: {:?}",
                        "✗".to_owned().red(),
                        e
                    );
                    if let Some(opt_retry) = options.retry.as_ref() {
                        if entry.retry_no < opt_retry.max {
                            self.retry(entry).await;
                        }
                    }
                }
                Ok(mut res) => {
                    if res.has_error() {
                        error!(
                            "{} Failed to push typegraph {tg_name}",
                            "✗".to_owned().red(),
                        );
                        let should_retry = res.should_retry();
                        self.handle_push_result(res);
                        if let Some(opt_retry) = options.retry.as_ref() {
                            if should_retry && entry.retry_no < opt_retry.max {
                                self.retry(entry).await;
                            }
                        }
                    } else {
                        info!(
                            "{} Successfully pushed typegraph {tg_name}.",
                            "✓".to_owned().green()
                        );
                        res.path = entry.typegraph.path.clone();
                        self.handle_push_result(res);
                    }
                }
            }
        }
    }

    async fn retry(&mut self, entry: PushQueueEntry) {
        let interval = self.options.retry.as_ref().unwrap().interval;
        info!(
            "  Retrying to push in {} seconds...",
            interval.as_secs_f32()
        );
        let mut entry = entry;
        entry.retry_no += 1;

        let sender = self.sender.clone();
        self.pending_retries += 1;
        tokio::spawn(async move {
            tokio::time::sleep(interval).await;
            sender.send(entry).unwrap();
        });
    }

    async fn next(&mut self) -> Result<Option<PushQueueEntry>> {
        match self.receiver.try_recv() {
            Err(TryRecvError::Empty) => {
                if self.pending_retries == 0 && self.options.exit {
                    Ok(None)
                } else {
                    Ok(self.receiver.recv().await)
                }
            }
            Err(TryRecvError::Disconnected) => {
                // unreachable since self has a sender
                Ok(None)
            }
            Ok(entry) => Ok(Some(entry)),
        }
    }
}

pub struct PushLoop {
    join_handle: JoinHandle<Result<()>>,
    sender: UnboundedSender<PushQueueEntry>,
}

impl PushLoop {
    pub async fn join(self) -> Result<()> {
        self.join_handle.await?
    }

    pub fn push(&mut self, entry: PushQueueEntry) -> Result<()> {
        Ok(self.sender.send(entry)?)
    }
}
