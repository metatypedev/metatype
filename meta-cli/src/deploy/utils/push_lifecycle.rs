// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use actix::clock::sleep;
use actix::prelude::*;
use anyhow::{bail, Result};
use async_trait::async_trait;
use colored::Colorize;
use common::typegraph::Typegraph;
use tokio::sync::mpsc;
use tokio::sync::watch;
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

#[derive(Clone, Debug)]
enum Status {
    // no current push
    Idle,
    Running,
    // not accepting new pushes
    Ending,
    // all pushes ended
    Ended,
}

#[derive(Debug)]
struct State {
    active_pushes: HashMap<TypegraphId, PushStatus>,
    status_tx: watch::Sender<Status>,
    status_rx: watch::Receiver<Status>,
}

impl State {
    fn set_active(&mut self, tg: &Typegraph) {
        self.active_pushes
            .insert(id(tg), PushStatus { cancelled: false });
        self.status_tx.send(Status::Running).unwrap();
    }

    fn unset_active(&mut self, tg: &Typegraph) {
        log::debug!(
            "unset_active: {}#{}",
            tg.path.as_ref().unwrap().display(),
            tg.name().unwrap()
        );
        log::debug!("active_pushes: {:?}", self.active_pushes);
        self.active_pushes.remove(&id(tg)).unwrap();
        log::debug!("active_pushes (after removal): {:?}", self.active_pushes);
        if self.active_pushes.is_empty() {
            let status = self.status_rx.borrow();
            log::debug!("status: {:?}", *status);
            match *status {
                Status::Idle => {
                    panic!("unexpected status: {:?}", *status);
                }
                Status::Running => {
                    self.status_tx.send(Status::Idle).unwrap();
                }
                Status::Ending => {
                    log::debug!("ending -> ended");
                    self.status_tx.send(Status::Ended).unwrap();
                }
                Status::Ended => {
                    panic!("unexpected status: {:?}", *status);
                }
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
    pub status_rx: watch::Receiver<Status>,
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
        let (status_tx, status_rx) = watch::channel(Status::Running);
        let state = Arc::new(Mutex::new(State {
            active_pushes: HashMap::new(),
            status_tx,
            status_rx: status_rx.clone(),
        }));

        let lifecycle = PushLifecycle(Arc::new(PushLifecycleInner {
            retry_scheduler: Arc::new(Mutex::new(self.retry_scheduler)),
            state: state.clone(),
            sender: Sender {
                pusher: self.pusher,
                state,
            },
            status_rx,
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
        let retry_scheduler = self.0.retry_scheduler.clone();
        let sender = self.0.sender.clone();
        let state = self.0.state.clone();
        Arbiter::current().spawn(async move {
            let max_retry_count = retry_scheduler.lock().await.max_retry_count();
            while let Some(event) = event_rx.recv().await {
                log::debug!("event");
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

    pub async fn stop(&self) -> Result<()> {
        {
            {
                let status = self.0.status_rx.borrow();
                log::debug!("stopping, status: {:?}", *status);
                match *status {
                    Status::Idle => {
                        return Ok(());
                    }
                    Status::Running => {}
                    Status::Ending => {
                        bail!("Push lifecycle is already stopping");
                    }
                    Status::Ended => {
                        bail!("Push lifecycle is already stopped");
                    }
                }
            }

            self.0.state.lock().await.status_tx.send(Status::Ending)?;
            let mut status_rx = self.0.status_rx.clone();
            {
                let status = status_rx.borrow();
                log::debug!("set to ending, status: {:?}", *status);
                match *status {
                    Status::Ending => {}
                    _ => {
                        unreachable!("Status should be ending");
                    }
                }
            }

            loop {
                status_rx.changed().await?;
                log::debug!("FINAL: {:?}", *status_rx.borrow());

                // let status = status_rx.borrow_and_update();
                let status = status_rx.borrow();
                match *status {
                    Status::Running | Status::Idle => {
                        unreachable!();
                    }
                    Status::Ending => continue,
                    Status::Ended => return Ok(()),
                }
            }
        }
    }
}
