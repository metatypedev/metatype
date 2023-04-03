// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use colored::Colorize;
use indoc::indoc;
use serde::Deserialize;
use serde_json::json;
use std::{path::PathBuf, sync::Arc, time::Duration};

use common::typegraph::Typegraph;
use tokio::{
    runtime::Handle,
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
pub struct PushResult {
    name: String,
    // data: HashMap<String, serde_json::Value>,
    messages: Vec<MessageEntry>,
}

impl PushResult {
    pub fn print_messages(&self) {
        let name = self.name.blue();
        for msg in self.messages.iter() {
            match msg {
                MessageEntry::Info(txt) => {
                    println!("[{type} {name}] {txt}", type = "info".green());
                }
                MessageEntry::Warning(txt) => {
                    println!("[{type} {name}] {txt}", type = "warning".yellow());
                }
                MessageEntry::Error(txt) => {
                    println!("[{type} {name}] {txt}", type = "error".red())
                }
            }
        }
    }
}

#[derive(Debug)]
pub struct PushQueueEntry {
    path: PathBuf,
    typegraph: Typegraph,
    retry_no: u32, //
}

impl PushQueueEntry {
    pub fn new(path: PathBuf, typegraph: Typegraph) -> Self {
        Self {
            path,
            typegraph,
            retry_no: 0,
        }
    }

    async fn push(&self, node: &Node) -> Result<PushResult> {
        let tg = &self.typegraph;

        let res = node
            .post("/typegate")?
            .gql(
                indoc! {"
                mutation InsertTypegraph {
                    addTypegraph(fromString: $tg) {
                        name
                        messages { type text }
                    }
                }"}
                .to_string(),
                Some(json!({ "tg": serde_json::to_string(tg)? })),
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
    on_pushed: C,
}

impl PushLoopBuilder<DefaultPushResultConsumer> {
    pub fn on(node: Node) -> Self {
        Self {
            exit: false,
            retry: None,
            node,
            on_pushed: DefaultPushResultConsumer,
        }
    }

    pub fn on_pushed<C: Fn(PushResult) + Send + 'static>(self, handler: C) -> PushLoopBuilder<C> {
        PushLoopBuilder {
            exit: self.exit,
            retry: self.retry,
            node: self.node,
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
            println!("Pushing typegraph {tg_name} from {:?}...", entry.path);
            let options = Arc::clone(&self.options);
            match entry.push(&self.options.node).await {
                Err(e) => {
                    println!(
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
                Ok(res) => {
                    println!(
                        "{} Successfully pushed typegraph {tg_name}.",
                        "✓".to_owned().green()
                    );

                    self.handle_push_result(res);
                }
            }
        }
    }

    async fn retry(&mut self, entry: PushQueueEntry) {
        let interval = self.options.retry.as_ref().unwrap().interval;
        println!(
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
