// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use colored::Colorize;
use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use indoc::indoc;
use pathdiff::diff_paths;
use serde::Deserialize;

use crate::config::Config;
use crate::typegraph::postprocess::EmbeddedPrismaMigrationOptionsPatch;
use crate::utils::graphql;
use crate::utils::{graphql::Query, Node};

use super::console::{Console, ConsoleActor};
use super::push_manager::{ConfirmHandler, PushFinished, PushManagerActor};

type Secrets = HashMap<String, String>;

#[derive(Clone, Debug)]
struct Retry {
    num: u32,
    max: u32,
}

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

pub struct PusherActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    push_manager: Addr<PushManagerActor>,
    secrets: Arc<Secrets>,
}

impl PusherActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        base_dir: Arc<Path>,
        node: Node,
        secrets: Secrets,
        push_manager: Addr<PushManagerActor>,
    ) -> Self {
        Self {
            config,
            console,
            base_dir,
            node: Arc::new(node),
            secrets: secrets.into(),
            push_manager,
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
                            failure
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

    fn handle_error(
        push: Push,
        error: Error,
        console: Addr<ConsoleActor>,
        push_manager: Addr<PushManagerActor>,
    ) {
        match error {
            Error::Graphql(e) => match e {
                graphql::Error::EndpointNotReachable(e) => {
                    console.error(format!("Failed to push typegraph:\n{e}"));
                    push_manager.do_send(PushFinished::new(push, false).schedule_retry());
                }
                graphql::Error::InvalidResponse(e) => {
                    console.error(format!("Invalid resposes from typegate:\n{e}"));
                    push_manager.do_send(PushFinished::new(push, false));
                }
                graphql::Error::FailedQuery(errs) => {
                    console.error("Failed to push typegraph:".to_string());
                    for err in errs {
                        console.error(format!(" * {}", err.message));
                    }
                    push_manager.do_send(PushFinished::new(push, false));
                }
            },
            Error::Other(e) => {
                console.error(format!("Unexpected error: {e}"));
                push_manager.do_send(PushFinished::new(push, false));
            }
        }
    }
}

#[derive(Message, Clone, Debug)]
#[rtype(result = "()")]
pub struct Push {
    pub typegraph: Arc<Typegraph>,
    // pub created_at: Instant,
    retry: Option<Retry>,
}

impl Push {
    pub fn new(typegraph: Arc<Typegraph>) -> Self {
        Self {
            typegraph,
            retry: None,
        }
    }

    pub fn retry(self, max: u32) -> Option<Self> {
        let retry_num = self.retry.map(|r| r.num + 1).unwrap_or(1);
        (retry_num <= max).then_some(Self {
            retry: Some(Retry {
                num: retry_num,
                max,
            }),
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
    NullConstraintViolation {
        message: String,
        #[serde(rename = "runtimeName")]
        runtime_name: String,
        column: String,
        table: String,
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
        let push_manager = self.push_manager.clone();

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
                    Self::handle_error(push, e, console, push_manager);
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
                    self.push_manager
                        .do_send(PushFinished::new(res.push, false))
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

                    let typegraph = res.push.typegraph.clone();
                    self.push_manager
                        .do_send(PushFinished::new(res.push, false).confirm(
                            format!(
                                "Do you want to reset the database for runtime {rt} on {name}?",
                                rt = runtime_name.magenta(),
                                name = name.cyan()
                            ),
                            ConfirmDatabaseRequired {
                                runtime_name: runtime_name.clone(),
                                typegraph,
                            },
                        ));
                }

                PushFailure::NullConstraintViolation { message, .. } => {
                    self.console.error(message.clone());
                    self.push_manager
                        .do_send(PushFinished::new(res.push, false))
                }
            }
        } else {
            self.push_manager.do_send(PushFinished::new(res.push, true))
        }
    }
}

#[derive(Debug)]
struct ConfirmDatabaseRequired {
    runtime_name: String,
    typegraph: Arc<Typegraph>,
}

impl ConfirmHandler for ConfirmDatabaseRequired {
    fn on_confirm(&self, push_manager: Addr<PushManagerActor>) {
        let mut typegraph = (*self.typegraph).clone();
        EmbeddedPrismaMigrationOptionsPatch::default()
            .reset_on_drift(true)
            .apply(&mut typegraph, vec![self.runtime_name.clone()])
            .unwrap();
        push_manager.do_send(Push::new(typegraph.into()))
    }
}

impl Handler<Stop> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        ctx.stop();
    }
}
