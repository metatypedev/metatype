// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use colored::Colorize;
use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{anyhow, Context as AnyhowContext, Result};
use dialoguer::Confirm;
use indoc::indoc;
use pathdiff::diff_paths;
use serde::Deserialize;
use tokio::sync::watch;

use crate::config::Config;
use crate::typegraph::postprocess::EmbeddedPrismaMigrationOptionsPatch;
use crate::typegraph::push::{MessageEntry, Migrations};
use crate::utils::plural_suffix;
use crate::utils::{graphql::Query, Node};

use super::console::{error, info, warning, ConsoleActor};

type Secrets = HashMap<String, String>;
type SecretsTx = watch::Sender<Option<Arc<Secrets>>>;
type SecretsRx = watch::Receiver<Option<Arc<Secrets>>>;

pub struct PusherActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    secrets_tx: SecretsTx,
    queue: VecDeque<Arc<Typegraph>>,
    current: Option<Arc<Typegraph>>,
}

#[allow(dead_code)]
enum Retry {
    Later,
    #[allow(dead_code)]
    WithPatch(Box<dyn Fn(Typegraph) -> Typegraph>),
}

impl PusherActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        base_dir: PathBuf,
        node: Node,
    ) -> Self {
        let (secrets_tx, _) = watch::channel(None);
        Self {
            config,
            console,
            base_dir: base_dir.as_path().into(),
            node: Arc::new(node),
            secrets_tx,
            queue: VecDeque::new(),
            current: None,
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

    fn next(&mut self, ctx: &mut Context<Self>) {
        if self.current.is_some() {
            error!(
                self.console,
                "Invalid state: next() called while currently busy."
            );
            // TODO panic?? -- exit??
        }
        if let Some(tg) = self.queue.pop_front() {
            self.current = Some(Arc::clone(&tg));
            let secrets_rx = self.secrets_tx.subscribe();
            let node = Arc::clone(&self.node);
            let self_addr = ctx.address();
            let console = self.console.clone();

            Arbiter::current().spawn(async move {
                match Self::push(tg, node, secrets_rx).await {
                    Ok(res) => {
                        self_addr.do_send(res);
                    }
                    Err(e) => {
                        error!(console, "Error pushing typegraph: {e}");
                        // TODO
                        // self_addr.do_send(Retry::Later);
                    }
                }
            });
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct PushTypegraph(pub Arc<Typegraph>);

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelPush(pub PathBuf);

#[derive(Message, Deserialize)]
#[rtype(result = "()")]
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    name: String,
    pub messages: Vec<MessageEntry>,
    migrations: Vec<Migrations>,
    reset_required: Vec<String>,
    #[serde(skip)]
    pub original_name: Option<String>,
}

// TODO message CancelPush

impl Actor for PusherActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher started");
        // TODO load secrets
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher stopped");
    }
}

impl PusherActor {
    async fn push(
        tg: Arc<Typegraph>,
        node: Arc<Node>,
        mut secrets_rx: SecretsRx,
    ) -> Result<PushResult> {
        // wait for secrets to be loaded
        // this will return immediately if the secrets are already loaded
        secrets_rx.changed().await?;
        let secrets = secrets_rx
            .borrow()
            .as_ref()
            .map(Arc::clone)
            .ok_or_else(|| anyhow!("Secrets not loaded. This is a bug. Please report it."))?;

        // TODO can we set the prefix before the push? // in the loader??
        // so we wont need to clone
        let tg = &*tg;
        let tg = match node.prefix.as_ref() {
            Some(prefix) => tg.with_prefix(prefix.clone())?,
            None => tg.clone(),
        };
        let res = node
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
                Some(serde_json::json!({
                    "tg": serde_json::to_string(&tg)?,
                    "secrets": serde_json::to_string(&secrets)?,
                    "cliVersion": common::get_version()
                })),
            )
            .await?;

        let res: PushResult = res
            .data("addTypegraph")
            .context("addTypegraph field in the response")?;

        Ok(res)
    }
}

impl Handler<PushTypegraph> for PusherActor {
    type Result = ();

    fn handle(&mut self, msg: PushTypegraph, ctx: &mut Self::Context) -> Self::Result {
        self.queue.push_back(msg.0);
        if self.current.is_none() {
            self.next(ctx);
        }
    }
}

impl Handler<CancelPush> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: CancelPush, _ctx: &mut Self::Context) -> Self::Result {
        // TODO cancel pending push/re-push
    }
}

impl Handler<PushResult> for PusherActor {
    type Result = ();

    fn handle(&mut self, res: PushResult, ctx: &mut Self::Context) -> Self::Result {
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
                    diff_paths(dest, &self.base_dir)
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

        if !res.reset_required.is_empty()
            && Confirm::new()
                .with_prompt(format!(
                    "{} Do you want to reset the database{s} for {runtimes} on {name}?",
                    "[confirm]".yellow(),
                    s = plural_suffix(res.reset_required.len()),
                    runtimes = res.reset_required.join(", ").magenta(),
                    name = name.cyan(),
                ))
                .interact()
                .unwrap()
        {
            let tg = self.queue.pop_front().unwrap();
            let mut tg = (*tg).clone();
            EmbeddedPrismaMigrationOptionsPatch::default()
                .reset_on_drift(true)
                .apply(&mut tg, res.reset_required)
                .unwrap();
            self.queue.push_front(Arc::new(tg));
            let _ = self.current.take().unwrap();
            self.next(ctx);
        }
    }
}
