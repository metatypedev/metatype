// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::{BTreeMap, HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use colored::Colorize;
use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use dialoguer::Confirm;
use indoc::indoc;
use pathdiff::diff_paths;
use serde::Deserialize;

use crate::config::Config;
use crate::typegraph::postprocess::EmbeddedPrismaMigrationOptionsPatch;
use crate::typegraph::push::{MessageEntry, Migrations};
use crate::utils::graphql;
use crate::utils::{graphql::Query, Node};

use super::console::{error, info, warning, ConsoleActor};

type Secrets = HashMap<String, String>;

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
    queue: VecDeque<(Push, Instant)>,
    current: Option<Push>,
    max_retry_count: u32,
    retry_interval: Duration,
    cancellations: BTreeMap<Instant, PathBuf>,
}

impl PusherActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        base_dir: Arc<Path>,
        node: Node,
        secrets: Secrets,
    ) -> Self {
        Self {
            config,
            console,
            base_dir,
            node: Arc::new(node),
            secrets: secrets.into(),
            queue: VecDeque::new(),
            current: None,
            max_retry_count: 3,
            retry_interval: Duration::from_secs(5),
            cancellations: BTreeMap::new(),
        }
    }

    pub fn print_messages(&self, tg_name: &str, messages: &[MessageEntry]) {
        let name = tg_name.blue();
        for msg in messages.iter() {
            match msg {
                MessageEntry::Info(txt) => {
                    info!(self.console, "[{name}] {txt}");
                }
                MessageEntry::Warning(txt) => {
                    warning!(self.console, "[{name}] {txt}");
                }
                MessageEntry::Error(txt) => {
                    error!(self.console, "[{name}] {txt}");
                }
            }
        }
    }

    fn remove_cancellations_before(&mut self, instant: Instant) {
        self.cancellations = self.cancellations.split_off(&instant);
    }

    fn next(&mut self, ctx: &mut Context<Self>) {
        if self.current.is_some() {
            error!(
                self.console,
                "Invalid state: next() called while currently busy."
            );
            // TODO panic?? -- exit??
        }

        while let Some((push, instant)) = self.queue.pop_front() {
            // cancelled after push
            let cancelled = self
                .cancellations
                .range(instant..)
                .any(|(_, path)| push.typegraph.path.as_ref().unwrap() == path);
            if cancelled {
                continue; // next
            }

            if let Some(retry) = push.retry.as_ref() {
                // remove cancellations before the retry instant
                self.remove_cancellations_before(retry.instant);

                // cancelled after retry
                let cancelled = self
                    .cancellations
                    .iter()
                    .any(|(_, path)| push.typegraph.path.as_ref().unwrap() == path);
                if cancelled {
                    continue;
                }
            } else {
                self.remove_cancellations_before(instant - self.retry_interval * 2);
            }

            self.current = Some(push.clone());
            let node = Arc::clone(&self.node);
            let self_addr = ctx.address();
            let console = self.console.clone();

            let secrets = Arc::clone(&self.secrets);
            let retry_max = self.max_retry_count;

            Arbiter::current().spawn(async move {
                let retry_no = push.retry.map(|r| r.retry_no).unwrap_or(0);
                let retry = if retry_no > 0 {
                    format!(" (retry {}/{})", retry_no, retry_max).dimmed()
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
                info!(
                    console,
                    "Pushing typegraph {tg_name}{retry} (from '{file_name}')"
                );
                match Self::push(Arc::clone(&push.typegraph), node, secrets).await {
                    Ok(mut res) => {
                        res.original_name = Some(push.typegraph.name().unwrap().clone());
                        self_addr.do_send(res);
                    }
                    Err(e) => {
                        self_addr.try_send(e).unwrap();
                    }
                }
            });

            break;
        }
    }

    fn graphql_vars(tg: &Typegraph, secrets: &Secrets) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "tg": serde_json::to_string(&tg)?,
            "secrets": serde_json::to_string(secrets)?,
            "cliVersion": common::get_version()
        }))
    }

    async fn push(
        tg: Arc<Typegraph>,
        node: Arc<Node>,
        secrets: Arc<Secrets>,
    ) -> Result<PushResult, Error> {
        // TODO can we set the prefix before the push? // in the loader??
        // so we wont need to clone
        let tg = &*tg;
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
            .map_err(Error::Other)?;

        res.try_into().map_err(Error::Other)
    }
}

#[derive(Message, Clone)]
#[rtype(result = "()")]
pub struct Push {
    typegraph: Arc<Typegraph>,
    retry: Option<Retry>,
}

#[derive(Clone, Debug)]
struct Retry {
    instant: Instant,
    retry_no: u32,
}

impl Push {
    pub fn new(typegraph: Arc<Typegraph>) -> Self {
        Self {
            typegraph,
            retry: None,
        }
    }

    fn retry(self, retry_no: u32) -> Self {
        Self {
            retry: Some(Retry {
                instant: Instant::now(),
                retry_no,
            }),
            ..self
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelPush(pub PathBuf);

#[derive(Deserialize, Debug)]
#[serde(tag = "reason")]
enum PushFailure {
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
    name: String,
    pub messages: Vec<MessageEntry>,
    migrations: Vec<Migrations>,
    failure: Option<PushFailure>,
    pub original_name: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResultRaw {
    pub name: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migrations>,
    pub failure: Option<String>,
}

impl TryFrom<PushResultRaw> for PushResult {
    type Error = anyhow::Error;

    fn try_from(raw: PushResultRaw) -> Result<Self, Self::Error> {
        let failure = match raw.failure {
            Some(failure) => Some(serde_json::from_str(&failure)?),
            None => None,
        };

        Ok(Self {
            name: raw.name,
            messages: raw.messages,
            migrations: raw.migrations,
            failure,
            original_name: None,
        })
    }
}

#[derive(Message, Debug)]
#[rtype(result = "Result<()>")]
enum Error {
    Graphql(graphql::Error),
    Other(anyhow::Error),
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

    fn handle(&mut self, push: Push, ctx: &mut Self::Context) -> Self::Result {
        self.queue.push_back((push, Instant::now()));
        if self.current.is_none() {
            self.next(ctx);
        }
    }
}

impl Handler<CancelPush> for PusherActor {
    type Result = ();

    fn handle(&mut self, msg: CancelPush, _ctx: &mut Self::Context) -> Self::Result {
        self.cancellations.insert(Instant::now(), msg.0);
    }
}

impl Handler<PushResult> for PusherActor {
    type Result = ();

    fn handle(&mut self, res: PushResult, ctx: &mut Self::Context) -> Self::Result {
        let _ = self.current.take().unwrap();

        let name = res.name.clone();
        self.print_messages(&name, &res.messages);

        let migdir = self
            .config
            .prisma_migrations_dir(res.original_name.as_ref().unwrap());

        for migrations in res.migrations.into_iter() {
            let dest = migdir.join(&migrations.runtime);
            // TODO async??
            if let Err(e) = common::archive::unpack(&dest, Some(migrations.migrations)) {
                error!(
                    self.console,
                    "Error while unpacking migrations into {:?}",
                    diff_paths(&dest, &self.base_dir)
                );
                error!(self.console, "{e:?}");
            } else {
                info!(
                    self.console,
                    "Successfully unpacked migrations for {name}/{} at {:?}!",
                    migrations.runtime,
                    dest
                );
            }
        }

        if let Some(failure) = res.failure {
            match failure {
                PushFailure::Unknown { message } => {
                    error!(
                        self.console,
                        "Unknown error while pushing typegraph {tg_name}",
                        tg_name = name.cyan(),
                    );
                    error!(self.console, "{message}");
                }
                PushFailure::DatabaseResetRequired {
                    message,
                    runtime_name,
                } => {
                    error!(
                        self.console,
                        "Database reset required for typegraph {tg_name}",
                        tg_name = name.cyan(),
                    );
                    error!(self.console, "{message}");

                    if Confirm::new()
                        .with_prompt(format!(
                            "{} Do you want to reset the database for runtime {runtime} on {name}?",
                            "[confirm]".yellow(),
                            runtime = runtime_name.magenta(),
                            name = name.cyan(),
                        ))
                        .interact()
                        .unwrap()
                    {
                        let push = self.current.take().unwrap();
                        let mut tg = (*push.typegraph).clone();
                        EmbeddedPrismaMigrationOptionsPatch::default()
                            .reset_on_drift(true)
                            .apply(&mut tg, vec![runtime_name])
                            .unwrap();
                        self.queue
                            .push_front((Push::new(tg.into()), Instant::now()));
                        let _ = self.current.take().unwrap();
                        self.next(ctx);
                    }
                }
            }
        } else {
            info!(
                self.console,
                "{} Successfully pushed typegraph {name}.",
                "✓".green(),
                name = name.cyan()
            );
        }

        // let success = res
        //     .messages
        //     .iter()
        //     .any(|m| matches!(m, MessageEntry::Error(_)));
    }
}

impl Handler<Error> for PusherActor {
    type Result = Result<()>;

    fn handle(&mut self, err: Error, ctx: &mut Self::Context) -> Self::Result {
        match err {
            Error::Graphql(e) => match e {
                graphql::Error::EndpointNotReachable(e) => {
                    error!(
                        self.console,
                        "Could not push typegraph: target endpoint not reachable."
                    );
                    error!(self.console, "{e}");

                    let push = self.current.take().unwrap();
                    let next_retry_no = push.retry.clone().map(|r| r.retry_no + 1).unwrap_or(1);

                    if next_retry_no <= self.max_retry_count {
                        let console = self.console.clone();
                        warning!(
                            console,
                            "Retrying in {} seconds...",
                            self.retry_interval.as_secs()
                        );

                        let retry_interval = self.retry_interval;
                        let self_addr = ctx.address();
                        Arbiter::current().spawn(async move {
                            tokio::time::sleep(retry_interval).await;
                            self_addr.do_send(push.retry(next_retry_no));
                        });
                    }

                    self.next(ctx);
                }

                graphql::Error::InvalidResponse(e) => {
                    error!(self.console, "Invalid response from server:");
                    error!(self.console, "{e}");
                    self.next(ctx);
                }

                graphql::Error::FailedQuery(errs) => {
                    error!(self.console, "Failed to push typegraph:");
                    for e in errs {
                        error!(self.console, "{}", e.message);
                    }
                    // TODO
                    let _ = self.current.take().unwrap();

                    self.next(ctx);
                }
            },
            Error::Other(e) => {
                error!(self.console, "Unexpected error: {e}", e = e.to_string());
                self.next(ctx);
            }
        }

        Ok(())
    }
}

impl Handler<Stop> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}
