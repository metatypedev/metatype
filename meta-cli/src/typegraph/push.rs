// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{Context, Result};
use colored::Colorize;
use indoc::indoc;
use serde::Deserialize;
use serde_json::json;
use std::{path::PathBuf, time::Duration};

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
pub struct MessageEntry {
    #[serde(rename = "type")]
    pub type_: MessageType,
    pub text: String,
}

#[derive(Deserialize, Debug)]
pub struct PushResult {
    name: String,
    // data: HashMap<String, serde_json::Value>,
    messages: Vec<MessageEntry>,
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
        eprintln!("Res: {res:?}");

        res.data("addTypegraph")
            .context("addTypegraph field in the response")
    }
}

struct Retry {
    max: u32,
    interval: Duration,
}

pub struct PushOptions {
    exit: bool, // exit when the queue is empty
    retry: Option<Retry>,
    node: Node,
}

impl PushOptions {
    pub fn on(node: Node) -> Self {
        Self {
            exit: false,
            retry: None,
            node,
        }
    }

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

    pub async fn start_with(
        self,
        push_entries: impl Iterator<Item = PushQueueEntry>,
    ) -> Result<Push> {
        let (sender, receiver) = unbounded_channel();

        for entry in push_entries {
            sender.send(entry)?;
        }

        let options = self;
        let sender_1 = sender.clone();
        println!("...");
        let join_handle = Handle::current().spawn(async move {
            PushLoop {
                receiver,
                sender: sender_1,
                pending_retries: 0,
                options,
            }
            .start()
            .await
        });

        Ok(Push {
            join_handle,
            sender,
        })
    }
}

struct PushLoop {
    receiver: UnboundedReceiver<PushQueueEntry>,
    sender: UnboundedSender<PushQueueEntry>,
    pending_retries: u32, // number of entry that will be pushed for retry
    options: PushOptions,
}

impl PushLoop {
    async fn start(&mut self) -> Result<()> {
        loop {
            let Some(entry) = self.next().await? else {
                // exit loop
                break Ok(());
            };

            if entry.retry_no > 0 {
                self.pending_retries -= 1;
            }

            let tg_name = entry.typegraph.name().unwrap().blue();
            println!("Pushing typegraph {tg_name} from {:?}...", entry.path,);
            match entry.push(&self.options.node).await {
                Err(e) => {
                    println!(
                        "{} Failed to push typegraph {tg_name}: {:?}",
                        "✗".to_owned().red(),
                        e
                    );
                    if let Some(opt_retry) = self.options.retry.as_ref() {
                        if entry.retry_no < opt_retry.max {
                            self.retry(entry).await;
                        }
                    }
                }
                Ok(_) => {
                    println!(
                        "{} Successfully pushed typegraph {tg_name}.",
                        "✓".to_owned().green()
                    );
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

pub struct Push {
    join_handle: JoinHandle<Result<()>>,
    sender: UnboundedSender<PushQueueEntry>,
}

impl Push {
    pub async fn join(self) -> Result<()> {
        self.join_handle.await?
    }
}
