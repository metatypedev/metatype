// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod state;

use state::*;
use std::collections::hash_map::Entry;
use std::convert::Infallible;
use std::path::PathBuf;
use std::time::Duration;
use std::{collections::HashMap, path::Path, sync::Arc};

use actix::prelude::*;
use anyhow::{bail, Result};
use async_trait::async_trait;
use colored::Colorize;
use common::typegraph::Typegraph;
use tokio::sync::oneshot;

use crate::config::Config;
use crate::utils::Node;

use super::console::{Console, ConsoleActor};
use super::pusher::{Push, PusherActor};

enum RetryConfig {
    Disable,
    LinearBackoff { interval: Duration, max_count: u32 },
}

pub struct PushManagerBuilder {
    console: Addr<ConsoleActor>,
    retry_config: RetryConfig,
}

impl PushManagerBuilder {
    pub fn new(console: Addr<ConsoleActor>) -> Self {
        Self {
            console,
            retry_config: RetryConfig::Disable,
        }
    }

    pub fn linear_backoff(mut self, interval: Duration, max_count: u32) -> Self {
        self.retry_config = RetryConfig::LinearBackoff {
            interval,
            max_count,
        };
        self
    }

    pub fn start(
        self,
        config: Arc<Config>,
        base_dir: Arc<Path>,
        node: Node,
        secrets: HashMap<String, String>,
    ) -> Addr<PushManagerActor> {
        PushManagerActor::create(|ctx| {
            let addr = ctx.address();
            let pusher =
                PusherActor::new(config, self.console.clone(), base_dir, node, secrets, addr)
                    .start();

            PushManagerActor {
                console: self.console,
                pusher,
                state: State::default(),
                retry_config: self.retry_config,
                typegraph_paths: HashMap::new(),
            }
        })
    }
}

pub struct PushManagerActor {
    console: Addr<ConsoleActor>,
    pusher: Addr<PusherActor>,
    state: State,
    retry_config: RetryConfig,
    typegraph_paths: HashMap<String, PathBuf>,
}

impl PushManagerActor {
    fn ensure_path(&mut self, name: &str, path: &Path) -> bool {
        match self.typegraph_paths.entry(name.to_owned()) {
            Entry::Occupied(entry) => {
                if entry.get().as_path() != path {
                    self.console.error(format!(
                        "Typegraph {:?} already exists at {:?}, cannot be pushed from {:?}",
                        name.cyan(),
                        entry.get(),
                        path
                    ));
                    false
                } else {
                    true
                }
            }

            Entry::Vacant(entry) => {
                entry.insert(path.to_path_buf());
                true
            }
        }
    }

    fn add_active(&mut self, tg: &Typegraph) -> bool {
        let console = self.console.clone();
        let path = tg.path.clone().unwrap();
        let name = tg.name().unwrap();

        if !self.ensure_path(&name, &path) {
            return false;
        }

        self.state
            .reduce(move |state| -> Result<(State, bool), Infallible> {
                use AddTypegraphError as E;
                match state.add_typegraph(&path, name.clone()) {
                    Ok(state) => Ok((state, true)),
                    Err(E::ActivePushExists(s)) => {
                        console.error(format!(
                            "There is an active push for typegraph {:?}, ignoring.",
                            name.cyan()
                        ));
                        Ok((s, false))
                    }
                    Err(E::StatusEnding(s)) => {
                        console.error(format!(
                            "PushManager is in 'stopping' state, ignoring push for typegraph {:?}.",
                            name.cyan()
                        ));
                        Ok((s, false))
                    }
                    Err(E::StatusEnded(s)) => {
                        console.error(format!(
                            "PushManager is in 'stopped' state, ignoring push for typegraph {:?}.",
                            name.cyan()
                        ));
                        Ok((s, false))
                    }
                }
            })
            .unwrap()
    }

    fn remove_active(&mut self, tg: &Typegraph) -> Option<CancelationStatus> {
        let console = self.console.clone();
        let path = tg.path.clone().unwrap();
        let name = tg.name().unwrap();

        if !self.ensure_path(&name, &path) {
            return None;
        }

        self.state
            .reduce(
                move |state| -> Result<(State, Option<CancelationStatus>), Infallible> {
                    use RemoveTypegraphError as E;
                    match state.remove_typegraph(&path, name.clone()) {
                        Ok((state, cancellation_status)) => Ok((state, Some(cancellation_status))),

                        Err(E::StatusIdle(s)) => {
                            console.error(format!(
                            "PushManager is in 'idle' state, ignoring removal for typegraph {:?}.",
                            name.cyan()
                        ));
                            Ok((s, None))
                        }
                        Err(E::PushNotActive(s)) => {
                            console.error(format!(
                                "PushManager is not pushing typegraph {:?}, ignoring removal.",
                                name.cyan()
                            ));
                            Ok((s, None))
                        }
                        Err(E::StatusEnded(s)) => {
                            console.error(format!(
                        "PushManager is in 'stopped' state, ignoring removal for typegraph {:?}.",
                        name.cyan()
                    ));
                            Ok((s, None))
                        }
                    }
                },
            )
            .unwrap()
    }

    fn schedule_retry(&mut self, push: Push, self_addr: Addr<Self>) {
        match &self.retry_config {
            RetryConfig::Disable => {}

            RetryConfig::LinearBackoff {
                interval,
                max_count,
            } => {
                let Some(push) = push.retry(*max_count) else {
                    return;
                };

                let interval = *interval;
                Arbiter::current().spawn(async move {
                    actix::clock::sleep(interval).await;
                    self_addr.do_send(push);
                });
            }
        }
    }
}

impl Actor for PushManagerActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PushManagerActor started");
        // self.state = State::Idle;
        // self.pusher.do_send(super::pusher::Init);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        log::trace!("PushManagerActor stopped");
    }
}

impl Handler<Push> for PushManagerActor {
    type Result = ();

    fn handle(&mut self, push: Push, _ctx: &mut Self::Context) -> Self::Result {
        if self.add_active(&push.typegraph) {
            self.pusher.do_send(push);
        } else {
            let tg_name = push.typegraph.name().unwrap().cyan();
            self.console
                .warning(format!("Typegraph {tg_name} was not pushed."));
        }
    }
}

#[derive(Debug)]
pub enum Interaction {}

#[derive(Debug)]
pub(super) enum PushFollowUp {
    ScheduleRetry,
    Interact(Interaction),
}

#[derive(Message)]
#[rtype(result = "()")]
pub(super) struct PushFinished {
    push: Push,
    success: bool,
    follow_up: Option<PushFollowUp>,
}

impl PushFinished {
    pub(super) fn new(push: Push, success: bool) -> Self {
        Self {
            push,
            success,
            follow_up: None,
        }
    }

    pub(super) fn schedule_retry(mut self) -> Self {
        self.follow_up = Some(PushFollowUp::ScheduleRetry);
        self
    }

    pub(super) fn interact(mut self, interaction: Interaction) -> Self {
        self.follow_up = Some(PushFollowUp::Interact(interaction));
        self
    }
}

impl Handler<PushFinished> for PushManagerActor {
    type Result = ();

    fn handle(&mut self, msg: PushFinished, ctx: &mut Self::Context) -> Self::Result {
        let name = msg.push.typegraph.name().unwrap();

        if msg.success {
            self.console.info(format!(
                "{} Successfully pushed typegraph {name}.",
                "✓".green(),
                name = name.cyan()
            ));
        }

        let res = self.remove_active(&msg.push.typegraph);
        let Some(CancelationStatus(is_cancelled)) = res else {
            return;
        };

        if let Some(follow_up) = msg.follow_up {
            use PushFollowUp as F;
            match follow_up {
                F::ScheduleRetry => {
                    if !is_cancelled {
                        self.schedule_retry(msg.push, ctx.address());
                    }
                }
                F::Interact(interaction) => {
                    if !is_cancelled {
                        todo!("interaction");
                    }
                }
            }
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct Stop {
    tx: oneshot::Sender<()>,
}

impl Handler<Stop> for PushManagerActor {
    type Result = ();

    fn handle(&mut self, msg: Stop, _ctx: &mut Self::Context) -> Self::Result {
        self.state
            .reduce2(move |state| -> Result<State> {
                match state {
                    State::Idle(_) => {
                        msg.tx.send(()).unwrap();
                        Ok(StateEnded.into())
                    }

                    State::Running(StateRunning {
                        modules,
                        typegraphs,
                    }) => Ok(StateEnding {
                        typegraphs,
                        modules,
                        ended_tx: msg.tx,
                    }
                    .into()),

                    State::Ending(_) => bail!("PushManager is already 'stopping'"),

                    State::Ended(_) => bail!("PushManager is already 'stopped'"),
                }
            })
            .unwrap();
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct CancelAllFromModule {
    path: PathBuf,
    tx: oneshot::Sender<()>,
}

impl Handler<CancelAllFromModule> for PushManagerActor {
    type Result = ();

    fn handle(&mut self, msg: CancelAllFromModule, _ctx: &mut Self::Context) -> Self::Result {
        let console = self.console.clone();

        self.state.reduce2(move |state| -> Result<State> {
            match state {
                State::Idle(_) => {
                    // TODO cancel pending retries
                    msg.tx.send(()).unwrap();
                    Ok(StateIdle.into())
                }

                State::Running(StateRunning {
                    mut modules,
                    typegraphs,
                }) => {
                    if let Some(status) = modules.get_mut(&msg.path) {
                        if status.on_cancellation_complete.is_some() {
                            panic!("todo: handle multiple concurrent cancellations");
                        } else {
                            status.on_cancellation_complete = Some(msg.tx);
                        }
                    }
                    Ok(StateRunning {
                        modules,
                        typegraphs,
                    }.into())
                }

                State::Ending (StateEnding{ modules, typegraphs, ended_tx }) => {
                    console.warning(
                        format!(
                            "PushManager is in 'stopping' state, ignoring cancellation for module {:?}.",
                            msg.path
                        )
                    );
                    Ok(StateEnding {
                        modules,
                        typegraphs,
                        ended_tx,
                    }.into())
                },

                State::Ended(_) => {
                    console.warning(
                        format!(
                            "PushManager is in 'stopped' state, ignoring cancellation for module {:?}.",
                            msg.path
                        )
                    );
                    Ok(State::Ended(StateEnded))
                },
            }
        }).unwrap();
    }
}

#[async_trait]
pub trait PushManager {
    async fn cancel_all_from(&self, path: &Path) -> Result<()>;
    async fn stop(&self) -> Result<()>;
}

#[async_trait]
impl PushManager for Addr<PushManagerActor> {
    async fn stop(&self) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        self.send(Stop { tx }).await?;
        rx.await?;
        Ok(())
    }

    async fn cancel_all_from(&self, path: &Path) -> Result<()> {
        let (tx, rx) = oneshot::channel();
        self.do_send(CancelAllFromModule {
            path: path.to_owned(),
            tx,
        });
        rx.await?;
        Ok(())
    }
}
