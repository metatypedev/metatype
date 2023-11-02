// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::{BTreeMap, HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

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

// TODO generic
// no retry vs with retry
// no retry: for default (non-watch) mode: -> collect all push errors
// with retry: for watch mode: -> retry on error
pub struct PusherActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    secrets_tx: SecretsTx,
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
    ) -> Self {
        let (secrets_tx, _) = watch::channel(None);
        Self {
            config,
            console,
            base_dir,
            node: Arc::new(node),
            secrets_tx,
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

        loop {
            if let Some((push, instant)) = self.queue.pop_front() {
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
                let secrets_rx = self.secrets_tx.subscribe();
                let node = Arc::clone(&self.node);
                let self_addr = ctx.address();
                // let console = self.console.clone();

                Arbiter::current().spawn(async move {
                    // TODO logging
                    match Self::push(Arc::clone(&push.typegraph), node, secrets_rx).await {
                        Ok(res) => {
                            self_addr.do_send(res);
                        }
                        Err(e) => {
                            self_addr.do_send(Error(e));
                        }
                    }
                });

                break;
            }
        }
    }

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

#[derive(Message)]
#[rtype(result = "()")]
struct LoadedSecrets(HashMap<String, String>);

#[derive(Message)]
#[rtype(result = "()")]
struct Error(anyhow::Error);

impl Actor for PusherActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let env = self.node.env.clone();
        let dir = self.base_dir.clone();
        let self_addr = ctx.address();
        let console = self.console.clone();

        Arbiter::current().spawn(async move {
            match lade_sdk::hydrate(env.clone(), dir.to_path_buf()).await {
                Ok(secrets) => {
                    self_addr.do_send(LoadedSecrets(secrets));
                }
                Err(e) => {
                    error!(console, "Error loading secrets: {e:?}");
                    // TODO exit
                }
            }
        });
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
            let push = self.current.take().unwrap();
            let mut tg = (*push.typegraph).clone();
            EmbeddedPrismaMigrationOptionsPatch::default()
                .reset_on_drift(true)
                .apply(&mut tg, res.reset_required)
                .unwrap();
            self.queue
                .push_front((Push::new(tg.into()), Instant::now()));
            let _ = self.current.take().unwrap();
            self.next(ctx);
        }
    }
}

impl Handler<Error> for PusherActor {
    type Result = ();

    fn handle(&mut self, err: Error, ctx: &mut Self::Context) -> Self::Result {
        error!(self.console, "{e:?}", e = err.0);
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
}

impl Handler<LoadedSecrets> for PusherActor {
    type Result = ();

    fn handle(&mut self, msg: LoadedSecrets, _ctx: &mut Self::Context) -> Self::Result {
        match self.secrets_tx.send(Some(Arc::new(msg.0))) {
            Ok(_) => {}
            Err(e) => {
                error!(self.console, "Error setting secrets: {e:?}");
                // TODO exit
            }
        }
    }
}
