// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Weak};

use colored::Colorize;
use common::typegraph::Typegraph;

use actix::prelude::*;
use anyhow::{Context as AnyhowContext, Result};
use indoc::indoc;
use pathdiff::diff_paths;
use tokio::sync::watch;

use crate::config::Config;
use crate::typegraph::push::{MessageEntry, PushResult};
use crate::utils::{graphql::Query, Node};

use super::console::{error, info, warning, ConsoleActor};

type Secrets = HashMap<String, String>;
type SecretsTx = watch::Sender<Weak<Secrets>>;
type SecretsRx = watch::Receiver<Weak<Secrets>>;

pub struct PusherActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    secrets_tx: SecretsTx,
}

/// Attributes of the PusherActor that does not hold any (mutable) state.
/// Can be moved into async blocks.
pub struct Pusher {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    base_dir: Arc<Path>,
    node: Arc<Node>,
    secrets_rx: SecretsRx,
}

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
        let (secrets_tx, _) = watch::channel(Weak::new());
        Self {
            config,
            console,
            base_dir: base_dir.as_path().into(),
            node: Arc::new(node),
            secrets_tx,
        }
    }

    fn pusher(&self) -> Pusher {
        Pusher {
            config: self.config.clone(),
            console: self.console.clone(),
            base_dir: self.base_dir.clone(),
            node: self.node.clone(),
            secrets_rx: self.secrets_tx.subscribe(),
        }
    }
}

impl Pusher {
    async fn push(
        // mut is required for the secrets_rx.changed()
        &mut self,
        tg: Arc<Typegraph>,
    ) -> Result<Option<Retry>> {
        // wait for secrets to be loaded
        // this will return immediately if the secrets are already loaded
        self.secrets_rx.changed().await?;
        let secrets = self.secrets_rx.borrow().upgrade().context("secrets")?;

        // TODO can we set the prefix before the push? // in the loader??
        // so we wont need to clone
        let tg = &*tg;
        let tg = match self.node.prefix.as_ref() {
            Some(prefix) => tg.with_prefix(prefix.clone())?,
            None => tg.clone(),
        };
        let res = self
            .node
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

        let mut res: PushResult = res
            .data("addTypegraph")
            .context("addTypegraph field in the response")?;
        res.original_name = Some(tg.name()?);

        Ok(self.handle_push_result(res))
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

    // TODO async: with console input
    fn handle_push_result(&self, mut res: PushResult) -> Option<Retry> {
        let name = res.tg_name().to_string();
        self.print_messages(&name, &res.messages);
        let migdir = self
            .config
            .prisma_migrations_dir(res.original_name.as_ref().unwrap());
        for migrations in res.take_migrations() {
            let dest = migdir.join(&migrations.runtime);
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

        // let resets = res.reset_required();
        // TODO async console confirm
        // if !resets.is_empty()
        //     && Confirm::new()
        //         .with_prompt(format!(
        //             "{} Do you want to reset the database{s} for {runtimes} on {name}?",
        //             "[confirm]".yellow(),
        //             s = plural_suffix(resets.len()),
        //             runtimes = resets.join(", ").magenta(),
        //             name = name.cyan(),
        //         ))
        //         .interact()
        //         .unwrap()
        // {
        //     return HandlePushResult::PushAgain {
        //         reset_database: resets.to_vec(),
        //     };
        // }

        if res.success() {
            info!(
                self.console,
                "{} Successfully pushed typegraph {name}.",
                "✓".green()
            );
            None
        } else {
            // in case of errors, we want to push again,
            // but at most 3 times, see retry handlers
            Some(Retry::Later)
        }
    }
}

// Note: only the LoaderActor stores a non-weak reference to the typegraph

#[derive(Message)]
#[rtype(result = "()")]
pub struct PushTypegraph(pub Arc<Typegraph>);

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelPush(pub PathBuf);

// TODO message CancelPush

impl Actor for PusherActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        println!("Pusher stopped");
    }
}

impl Handler<PushTypegraph> for PusherActor {
    type Result = ();

    fn handle(&mut self, msg: PushTypegraph, _ctx: &mut Self::Context) -> Self::Result {
        let mut pusher = self.pusher();
        Arbiter::current().spawn(async move {
            match pusher.push(msg.0).await {
                Ok(None) => (),
                Ok(Some(Retry::Later)) => {
                    // TODO retry
                }
                Ok(Some(Retry::WithPatch(_))) => (),
                Err(e) => {
                    error!(pusher.console, "Error while pushing typegraph: {e:?}");
                }
            }
        });
    }
}

impl Handler<CancelPush> for PusherActor {
    type Result = ();

    fn handle(&mut self, _msg: CancelPush, _ctx: &mut Self::Context) -> Self::Result {
        // TODO cancel pending push/re-push
    }
}
