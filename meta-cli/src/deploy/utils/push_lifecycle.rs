// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::sync::Condvar;
use std::time::Duration;

use actix::clock::sleep;
use actix::prelude::*;
use async_trait::async_trait;
use colored::Colorize;
use common::typegraph::Typegraph;
use tokio::sync::mpsc;
use tokio::sync::Mutex;

use crate::deploy::actors::pusher::Push;
use crate::deploy::actors::pusher::PushFailure;
use crate::deploy::actors::pusher::{PusherActor, PusherEvent};
use crate::typegraph::postprocess::EmbeddedPrismaMigrationOptionsPatch;

#[derive(Clone)]
pub struct Sender {
    pusher: Addr<PusherActor>,
    state: Arc<Mutex<State>>, // shared with PushLifecycleInner
}

impl Sender {
    async fn send(&self, push: Push) {
        self.state.lock().await.set_active(&push.typegraph);
        self.pusher.do_send(push);
    }
}

#[async_trait]
pub trait RetryScheduler: Clone {
    fn schedule_retry(&mut self, push: Push, send: Sender);
    async fn cancel_pending_retry(&mut self, path: &Path) -> bool;
    fn max_retry_count(&self) -> u32 {
        0
    }
}

#[derive(Clone)]
pub struct NoRetry;

#[async_trait]
impl RetryScheduler for NoRetry {
    fn schedule_retry(&mut self, _push: Push, _send: Sender) {}
    async fn cancel_pending_retry(&mut self, _path: &Path) -> bool {
        false
    }
}

#[derive(Clone)]
struct LinearBackoffConfig {
    retry_interval: Duration,
    max_retry_count: u32,
}

// TODO we could only use the name if unicity were ensured
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct TypegraphId {
    path: Arc<Path>,
    name: String,
}

fn id(typegraph: &Typegraph) -> TypegraphId {
    TypegraphId {
        path: typegraph.path.clone().unwrap(),
        name: typegraph.name().unwrap(),
    }
}

#[derive(Debug)]
struct PushStatus {
    /// when true, follow-up pushes are not scheduled
    cancelled: bool,
}

#[derive(Default)]
pub struct LinearBackoffState {
    // path -> names
    pending_retries: HashMap<Arc<Path>, Vec<String>>,
}

#[derive(Clone)]
pub struct LinearBackoff {
    config: LinearBackoffConfig,
    state: Arc<Mutex<LinearBackoffState>>,
}

#[async_trait]
impl RetryScheduler for LinearBackoff {
    fn schedule_retry(&mut self, push: Push, sender: Sender) {
        let state = self.state.clone();
        let retry_interval = self.config.retry_interval;
        Arbiter::current().spawn(async move {
            sleep(retry_interval).await;
            if state
                .lock()
                .await
                .pending_retries
                .contains_key(push.typegraph.path.as_ref().unwrap())
            {
                // not cancelled
                sender.send(push).await;
            }
        });
    }

    async fn cancel_pending_retry(&mut self, path: &Path) -> bool {
        let state = self.state.clone();
        let path = path.to_owned();
        let mut state = state.lock().await;
        state.pending_retries.remove(path.as_path()).is_some()
    }

    fn max_retry_count(&self) -> u32 {
        self.config.max_retry_count
    }
}

#[derive(Debug, Default)]
struct State {
    active_pushes: HashMap<TypegraphId, PushStatus>,
    on_all_pushes_ended: Option<Condvar>,
}

impl State {
    fn set_active(&mut self, tg: &Typegraph) {
        self.active_pushes
            .insert(id(tg), PushStatus { cancelled: false });
    }

    fn unset_active(&mut self, tg: &Typegraph) {
        self.active_pushes.remove(&id(tg)).unwrap();
        if self.active_pushes.is_empty() {
            if let Some(cv) = self.on_all_pushes_ended.as_ref() {
                cv.notify_all();
            }
        }
    }

    fn set_all_cancelled(&mut self, path: &Path) {
        // TODO this is not very efficient - use a different data structure
        for (id, status) in self.active_pushes.iter_mut() {
            if &*id.path == path {
                status.cancelled = true;
            }
        }
    }

    fn is_cancelled(&self, tg: &Typegraph) -> bool {
        self.active_pushes.get(&id(tg)).unwrap().cancelled
    }
}

#[derive(Clone)]
pub struct PushLifecycle<R: RetryScheduler + Sync + Send = NoRetry>(Arc<PushLifecycleInner<R>>);

struct PushLifecycleInner<R: RetryScheduler + Sync + Send = NoRetry> {
    retry_scheduler: Arc<Mutex<R>>,
    state: Arc<Mutex<State>>, // independently shared
    pub sender: Sender,
}

pub struct PushLifecycleBuilder<R: RetryScheduler + Sync + Send> {
    pusher_event_rx: mpsc::UnboundedReceiver<PusherEvent>,
    pusher: Addr<PusherActor>,
    retry_scheduler: R,
}

impl PushLifecycleBuilder<NoRetry> {
    pub fn linear_backoff(
        self,
        retry_interval: Duration,
        max_retry_count: u32,
    ) -> PushLifecycleBuilder<LinearBackoff> {
        let retry_scheduler = LinearBackoff {
            config: LinearBackoffConfig {
                retry_interval,
                max_retry_count,
            },
            state: Arc::new(Mutex::new(LinearBackoffState::default())),
        };

        PushLifecycleBuilder {
            pusher_event_rx: self.pusher_event_rx,
            pusher: self.pusher,
            retry_scheduler,
        }
    }
}
impl<R: RetryScheduler + Sync + Send + 'static> PushLifecycleBuilder<R> {
    pub fn start(self) -> PushLifecycle<R> {
        let state = Arc::new(Mutex::new(State::default()));
        let lifecycle = PushLifecycle(Arc::new(PushLifecycleInner {
            retry_scheduler: Arc::new(Mutex::new(self.retry_scheduler)),
            state: state.clone(),
            sender: Sender {
                pusher: self.pusher,
                state,
            },
        }));

        lifecycle.start(self.pusher_event_rx);

        lifecycle
    }
}

impl PushLifecycle {
    pub fn builder(
        pusher_event_rx: mpsc::UnboundedReceiver<PusherEvent>,
        pusher: Addr<PusherActor>,
    ) -> PushLifecycleBuilder<NoRetry> {
        PushLifecycleBuilder {
            pusher_event_rx,
            pusher,
            retry_scheduler: NoRetry,
        }
    }
}

impl<R: RetryScheduler + Sync + Send + 'static> PushLifecycle<R> {
    fn start(&self, mut event_rx: mpsc::UnboundedReceiver<PusherEvent>) {
        // let mut event_rx = self.loader_event_rx.clone();
        // let send = self.send.clone();
        // Arbiter::current().spawn(async move {
        //     while let Some(event) = event_rx.recv().await {
        //         match event {
        //             LoaderEvent::Typegraph(tg) => send(Push::new(tg.into())),
        //             LoaderEvent::Stopped(b) => {
        //                 if let StopBehavior::ExitFailure(msg) = b {
        //                     // TODO wait for active pushes to finish
        //                     panic!("{msg}");
        //                 }
        //             }
        //         }
        //     }
        //     log::trace!("Loader event channel closed.");
        // });

        let retry_scheduler = self.0.retry_scheduler.clone();
        let sender = self.0.sender.clone();
        let state = self.0.state.clone();
        Arbiter::current().spawn(async move {
            let max_retry_count = retry_scheduler.lock().await.max_retry_count();
            while let Some(event) = event_rx.recv().await {
                match event {
                    PusherEvent::TransportFailure(push) => {
                        state.lock().await.unset_active(&push.typegraph);
                        if let Some(push) = push.retry(max_retry_count) {
                            retry_scheduler.lock().await.schedule_retry(push, sender.clone());
                        }
                    }
                    PusherEvent::Success(push)
                    | PusherEvent::InvalidResponse(push)
                    | PusherEvent::Error(push) => {
                        state.lock().await.unset_active(&push.typegraph);
                    }
                    PusherEvent::TypegateHookError(push, e) => {
                        state.lock().await.unset_active(&push.typegraph);
                        match e {
                            PushFailure::DatabaseResetRequired {
                                message: _,
                                runtime_name,
                            } => {
                                if !state.lock().await.is_cancelled(&push.typegraph) && dialoguer::Confirm::new()
                                    .with_prompt(format!(
                                        "{} Do you want to reset the database for runtime {runtime} on {name}?",
                                        "[confirm]".yellow(),
                                        runtime = runtime_name.magenta(),
                                        name = push.typegraph.name().unwrap().cyan(),
                                    ))
                                    .interact()
                                    .unwrap()
                                {
                                    let mut tg = (*push.typegraph).clone();
                                    EmbeddedPrismaMigrationOptionsPatch::default()
                                        .reset_on_drift(true)
                                        .apply(&mut tg, vec![runtime_name])
                                        .unwrap();
                                    sender.send(Push::new(tg.into())).await;
                                }
                            }
                            PushFailure::Unknown { .. }=> {

                            }
                        }
                    }
                }
            }
        });
    }

    pub async fn cancel_pending_push(&mut self, path: &Path) {
        // prevent follow-up push (from interactive push)
        self.0.state.lock().await.set_all_cancelled(path);

        // prevent retries
        self.0
            .retry_scheduler
            .lock()
            .await
            .cancel_pending_retry(path)
            .await;
    }

    pub async fn send(&self, push: Push) {
        let sender = self.0.sender.clone();
        sender.send(push).await;
    }
}
