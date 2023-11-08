// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use colored::Colorize;
use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use indoc::indoc;
use pathdiff::diff_paths;
use serde::Deserialize;
use tokio::sync::mpsc;

use crate::config::Config;
use crate::typegraph::push::{MessageEntry, Migrations};
use crate::utils::graphql;
use crate::utils::{graphql::Query, Node};

use super::console::{Console, ConsoleActor};

type Secrets = HashMap<String, String>;

#[derive(Debug, Clone)]
pub enum PusherEvent {
    Success(Push),
    /// can retry
    TransportFailure(Push),
    /// bug: typegate did not property encode the response?
    InvalidResponse(Push),
    /// error from the typegate
    Error(Push),
    TypegateHookError(Push, PushFailure),
}

type EventTx = mpsc::UnboundedSender<PusherEvent>;
type EventRx = mpsc::UnboundedReceiver<PusherEvent>;

#[derive(Clone, Debug)]
struct Retry {
    num: u32,
    max: u32,
}

// TODO generic
// no retry vs with retry
// no retry: for default (non-watch) mode: -> collect all push errors
// with retry: for watch mode: -> retry on error
pub struct PusherActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    secrets: Arc<Secrets>,
    event_tx: EventTx,
}

impl PusherActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        base_dir: Arc<Path>,
        node: Node,
        secrets: Secrets,
        event_tx: EventTx,
    ) -> Self {
        Self {
            config,
            console,
            base_dir,
            node: Arc::new(node),
            secrets: secrets.into(),
            event_tx,
        }
    }

    pub fn print_messages(&self, tg_name: &str, messages: &[MessageEntry]) {
        let name = tg_name.blue();
        for msg in messages.iter() {
            match msg {
                MessageEntry::Info(txt) => {
                    self.console.info(format!("[{name}] {txt}"));
                }
                MessageEntry::Warning(txt) => {
                    self.console.warning(format!("[{name}] {txt}"));
                }
                MessageEntry::Error(txt) => {
                    self.console.error(format!("[{name}] {txt}"));
                }
            }
        }
    }

    // fn reduce(&self, push: Push, instant: Instant, ctx: &mut Context<Self>) -> bool {
    //     // cancelled after push
    //     let cancelled = self
    //         .cancellations
    //         .range(instant..)
    //         .any(|(_, path)| push.typegraph.path.as_ref().unwrap() == path);
    //     if cancelled {
    //         let mut response_tx = push.response_tx;
    //         response_tx.send(PushResponse::Cancelled).unwrap();
    //         return false;
    //     }
    //
    //     if let Some(retry) = push.retry.as_ref() {
    //         // remove cancellations before the retry instant
    //         self.remove_cancellations_before(retry.instant);
    //
    //         // cancelled after retry
    //         let cancelled = self
    //             .cancellations
    //             .iter()
    //             .any(|(_, path)| push.typegraph.path.as_ref().unwrap() == path);
    //         if cancelled {
    //             let mut response_tx = push.response_tx;
    //             response_tx.send(PushResponse::Cancelled).unwrap();
    //             return false;
    //         }
    //     } else {
    //         self.remove_cancellations_before(instant - self.retry_interval * 2);
    //     }
    //
    //     self.current = Some(push.clone());
    //     let node = Arc::clone(&self.node);
    //     let self_addr = ctx.address();
    //     let console = self.console.clone();
    //
    //     let secrets = Arc::clone(&self.secrets);
    //     let retry_max = self.max_retry_count;
    //
    //     Arbiter::current().spawn(async move {
    //         let retry_no = push.retry.map(|r| r.retry_no).unwrap_or(0);
    //         let retry = if retry_no > 0 {
    //             format!(" (retry {}/{})", retry_no, retry_max).dimmed()
    //         } else {
    //             "".dimmed()
    //         };
    //         let tg_name = push.typegraph.name().unwrap().cyan();
    //         let file_name = push
    //             .typegraph
    //             .path
    //             .as_ref()
    //             .unwrap()
    //             .display()
    //             .to_string()
    //             .dimmed();
    //         console.info(format!(
    //             "Pushing typegraph {tg_name}{retry} (from '{file_name}')"
    //         ));
    //         match Self::push(Arc::clone(&push.typegraph), node, secrets).await {
    //             Ok(res) => {
    //                 let mut res = PushResponse::from_raw(res);
    //                 res.original_name = Some(push.typegraph.name().unwrap().clone());
    //                 self_addr.do_send(res);
    //             }
    //             Err(e) => {
    //                 push.response_tx.send(PushResponse::Failure).unwrap();
    //                 self_addr.try_send(e).unwrap();
    //             }
    //         }
    //     });
    //
    //     true
    // }

    // fn next(&mut self, ctx: &mut Context<Self>) {
    //     if self.current.is_some() {
    //         self.console
    //             .error("Invalid state: next() called while currently busy.".to_string());
    //         // TODO panic?? -- exit??
    //     }
    //
    //     while let Some((push, instant)) = self.queue.pop_front() {
    //         if self.reduce(push, instant, ctx) {
    //             break;
    //         }
    //     }
    // }

    fn graphql_vars(tg: &Typegraph, secrets: &Secrets) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "tg": serde_json::to_string(&tg)?,
            "secrets": serde_json::to_string(secrets)?,
            "cliVersion": common::get_version()
        }))
    }

    async fn push(push: Push, node: Arc<Node>, secrets: Arc<Secrets>) -> Result<PushResult, Error> {
        // TODO can we set the prefix before the push? // in the loader??
        // so we wont need to clone
        let tg = &*push.typegraph;
        let tg = match node.prefix.as_ref() {
            Some(prefix) => tg.with_prefix(prefix.clone()).map_err(Error::Other)?,
            None => tg.clone(),
        };

        let secrets: &Secrets = &secrets;

        let res =  node
            .post("/typegate").map_err(|e| { Error::Other(e) })?
            .timeout(Duration::from_secs(10))
            .gql(
                indoc! {"
                    mutation InsertTypegraph($tg: String!, $secrets: String!, $cliVersion: String!) {
                        addTypegraph(fromString: $tg, secrets: $secrets, cliVersion: $cliVersion) {
                            name
                            messages { type text }
                            migrations { runtime migrations }

                        }
                    }"}
                .to_string(),
                Some(Self::graphql_vars(&tg, secrets).map_err(|e| { Error::Other(e) })?
            ))
            .await.map_err(|e| { Error::Graphql(e) })?;

        let res: PushResultRaw = res
            .data("addTypegraph")
            .context("addTypegraph field in the response")
            .map_err(|e| Error::invalid_response(e.to_string()))?;

        PushResult::from_raw(res, push).map_err(|e| Error::invalid_response(e.to_string()))
    }

    fn handle_error(push: Push, error: Error, console: Addr<ConsoleActor>, event_tx: EventTx) {
        match error {
            Error::Graphql(e) => match e {
                graphql::Error::EndpointNotReachable(e) => {
                    console.error(format!("Failed to push typegraph:\n{e}"));
                    event_tx.send(PusherEvent::TransportFailure(push)).unwrap();
                }
                graphql::Error::InvalidResponse(e) => {
                    console.error(format!("Invalid resposes from typegate:\n{e}"));
                    event_tx.send(PusherEvent::InvalidResponse(push)).unwrap();
                }
                graphql::Error::FailedQuery(errs) => {
                    console.error("Failed to push typegraph:".to_string());
                    for err in errs {
                        // TODO format error
                        console.error(format!(" * {}", err.message));
                    }
                    event_tx.send(PusherEvent::Error(push)).unwrap();
                }
            },
            Error::Other(e) => {
                console.error(format!("Unexpected error: {e}"));
                event_tx.send(PusherEvent::Error(push)).unwrap();
            }
        }
    }
}

// #[derive(Debug)]
// enum PushResponse {
//     Cancelled,
//     Success,
//     NetworkError,
//     Error,
//     // Interactive??
// }

#[derive(Message, Clone, Debug)]
#[rtype(result = "()")]
pub struct Push {
    pub typegraph: Arc<Typegraph>,
    pub created_at: Instant,
    retry: Option<Retry>,
}

impl Push {
    pub fn new(typegraph: Arc<Typegraph>) -> Self {
        Self {
            typegraph,
            retry: None,
            created_at: Instant::now(),
        }
    }

    pub fn retry(self, max: u32) -> Option<Self> {
        let retry_num = self.retry.map(|r| r.num + 1).unwrap_or(1);
        (retry_num <= max).then_some(Self {
            retry: Some(Retry {
                num: retry_num,
                max,
            }),
            created_at: Instant::now(),
            typegraph: self.typegraph,
        })
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelPush(pub PathBuf);

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "reason")]
pub enum PushFailure {
    Unknown {
        message: String,
    },
    DatabaseResetRequired {
        message: String,
        #[serde(rename = "runtimeName")]
        runtime_name: String,
    },
}

#[derive(Message, Debug)]
#[rtype(result = "()")]
pub struct PushResult {
    push: Push,
    name: String,
    messages: Vec<MessageEntry>,
    migrations: Vec<Migrations>,
    failure: Option<PushFailure>,
    original_name: Option<String>,
}

impl PushResult {
    fn from_raw(raw: PushResultRaw, push: Push) -> Result<Self> {
        let failure = match raw.failure {
            Some(failure) => Some(serde_json::from_str(&failure)?),
            None => None,
        };

        Ok(Self {
            push,
            name: raw.name,
            messages: raw.messages,
            migrations: raw.migrations,
            failure,
            original_name: None,
        })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResultRaw {
    pub name: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migrations>,
    pub failure: Option<String>,
}

#[derive(Message, Debug)]
#[rtype(result = "Result<()>")]
enum Error {
    Graphql(graphql::Error),
    Other(anyhow::Error),
}

impl Error {
    fn invalid_response(msg: String) -> Self {
        Self::Graphql(graphql::Error::InvalidResponse(msg))
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Stop;

impl Actor for PusherActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PusherActor started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PusherActor stopped");
    }
}

impl Handler<Push> for PusherActor {
    type Result = ();

    fn handle(&mut self, push: Push, ctx: &mut Self::Context) {
        let node = Arc::clone(&self.node);
        let self_addr = ctx.address();
        let console = self.console.clone();
        let secrets = Arc::clone(&self.secrets);
        let event_tx = self.event_tx.clone();

        Arbiter::current().spawn(async move {
            let retry = if let Some(retry) = &push.retry {
                format!(" (retry {}/{})", retry.num, retry.max).dimmed()
            } else {
                "".dimmed()
            };

            let tg_name = push.typegraph.name().unwrap().cyan();

            let file_name = push
                .typegraph
                .path
                .as_ref()
                .unwrap()
                .display()
                .to_string()
                .dimmed();
            console.info(format!(
                "Pushing typegraph {tg_name}{retry} (from '{file_name}')"
            ));

            match Self::push(push.clone(), node, secrets).await {
                Ok(mut res) => {
                    res.original_name = Some(push.typegraph.name().unwrap().clone());
                    self_addr.do_send(res);
                }
                Err(e) => {
                    Self::handle_error(push, e, console, event_tx);
                }
            }
        });
    }
}

impl Handler<PushResult> for PusherActor {
    type Result = ();

    fn handle(&mut self, res: PushResult, _ctx: &mut Self::Context) -> Self::Result {
        let name = res.name.clone();
        self.print_messages(&name, &res.messages);

        let migdir = self
            .config
            .prisma_migrations_dir(res.original_name.as_ref().unwrap());

        for migrations in res.migrations.into_iter() {
            let dest = migdir.join(&migrations.runtime);
            // TODO async??
            if let Err(e) = common::archive::unpack(&dest, Some(migrations.migrations)) {
                self.console.error(format!(
                    "Error while unpacking migrations into {:?}",
                    diff_paths(&dest, &self.base_dir)
                ));
                self.console.error(format!("{e:?}"));
            } else {
                self.console.info(format!(
                    "Successfully unpacked migrations for {name}/{} at {:?}!",
                    migrations.runtime, dest
                ));
            }
        }

        if let Some(failure) = res.failure {
            match &failure {
                PushFailure::Unknown { message } => {
                    self.console.error(format!(
                        "Unknown error while pushing typegraph {tg_name}",
                        tg_name = name.cyan(),
                    ));
                    self.console.error(message.clone());
                }
                PushFailure::DatabaseResetRequired {
                    message,
                    runtime_name,
                } => {
                    self.console.error(format!(
                        "Database reset required for prisma runtime '{runtime_name}' in typegraph {tg_name}",
                        tg_name = name.cyan(),
                    ));
                    self.console.error(message.clone());

                    // if Confirm::new()
                    //     .with_prompt(format!(
                    //         "{} Do you want to reset the database for runtime {runtime} on {name}?",
                    //         "[confirm]".yellow(),
                    //         runtime = runtime_name.magenta(),
                    //         name = name.cyan(),
                    //     ))
                    //     .interact()
                    //     .unwrap()
                    // {
                    //     let mut tg = (*push.typegraph).clone();
                    //     EmbeddedPrismaMigrationOptionsPatch::default()
                    //         .reset_on_drift(true)
                    //         .apply(&mut tg, vec![runtime_name])
                    //         .unwrap();
                    //     self.queue
                    //         .push_front((Push::new(tg.into()), Instant::now()));
                    //     let _ = self.current.take().unwrap();
                    //     self.next(ctx);
                    // }
                }
            }
            self.event_tx
                .send(PusherEvent::TypegateHookError(res.push, failure))
                .unwrap();
        } else {
            self.console.info(format!(
                "{} Successfully pushed typegraph {name}.",
                "✓".green(),
                name = name.cyan()
            ));
            self.event_tx.send(PusherEvent::Success(res.push)).unwrap();
        }

        // let success = res
        //     .messages
        //     .iter()
        //     .any(|m| matches!(m, MessageEntry::Error(_)));
    }
}

impl Handler<Stop> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}
