// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;

use actix::prelude::Context;
use actix::prelude::*;
use common::typegraph::Typegraph;
use tokio::sync::oneshot;

use crate::config::Config;
use crate::deploy::actors::console::warning;
use crate::deploy::actors::pusher::CancelPush;
use crate::deploy::actors::watcher;
use crate::typegraph::loader::{Loader, LoaderError};
use crate::typegraph::postprocess;

use super::console::{error, info, ConsoleActor};
use super::pusher::{Push, PusherActor};
use super::watcher::{UpdateDependencies, WatcherActor};

pub trait Watcher: Sized + Unpin + 'static {
    fn update_deps(&mut self, tg: Arc<Typegraph>);
    fn stop(&self);
}

pub struct NoWatch;

impl Watcher for NoWatch {
    fn update_deps(&mut self, _tg: Arc<Typegraph>) {}
    fn stop(&self) {}
}

impl Watcher for Addr<WatcherActor> {
    fn update_deps(&mut self, tg: Arc<Typegraph>) {
        self.do_send(UpdateDependencies(tg));
    }

    fn stop(&self) {
        // TODO wait for watcher to stop
        self.do_send(watcher::Stop);
    }
}

pub type WatchingLoaderActor = LoaderActor<Addr<WatcherActor>>;

#[derive(Debug)]
pub struct PostProcessOptions {
    pub deno_codegen: bool,
    pub prisma_run_migrations: bool,
    pub prisma_create_migration: bool,
    pub allow_destructive: bool,
}

#[derive(Clone, Copy, Debug)]
pub enum StopBehavior {
    Stop,
    Restart,
}

pub struct LoaderActor<W: Watcher = NoWatch> {
    config: Arc<Config>,
    directory: Arc<Path>,
    postprocess_options: PostProcessOptions,
    console: Addr<ConsoleActor>,
    pusher: Addr<PusherActor>,
    stopped_tx: Option<oneshot::Sender<StopBehavior>>,
    stop_behavior: StopBehavior,
    watcher: W,
}

impl LoaderActor {
    pub fn new(
        config: Arc<Config>,
        directory: Arc<Path>,
        postprocess_options: PostProcessOptions,
        console: Addr<ConsoleActor>,
        pusher: Addr<PusherActor>,
    ) -> Self {
        Self {
            config,
            directory,
            postprocess_options,
            console,
            pusher,
            stopped_tx: None,
            watcher: NoWatch,
            stop_behavior: StopBehavior::Stop, // N/A for non-watch mode
        }
    }

    pub fn start_in_watch_mode(self) -> Addr<WatchingLoaderActor> {
        Actor::create(|ctx| {
            let self_addr = ctx.address();
            let watcher_actor = WatcherActor::new(
                Arc::clone(&self.config),
                self.directory.clone(),
                self_addr.recipient(),
                self.console.clone(),
            )
            .expect("");
            LoaderActor {
                config: self.config,
                directory: self.directory,
                postprocess_options: self.postprocess_options,
                console: self.console,
                pusher: self.pusher,
                stopped_tx: self.stopped_tx,
                stop_behavior: StopBehavior::Restart,
                watcher: watcher_actor.start(),
            }
        })
    }
}

impl<W: Watcher> LoaderActor<W> {
    async fn load_module(
        loader: Loader,
        path: &Path,
        pusher: Addr<PusherActor>,
    ) -> Result<(), LoaderError> {
        let typegraphs = loader.load_module(path).await?;
        for tg in typegraphs.into_iter() {
            pusher.do_send(Push::new(tg.into()));
        }
        Ok(())
    }

    fn loader(&self) -> Loader {
        let mut loader = Loader::new(Arc::clone(&self.config))
            .skip_deno_modules(true)
            .with_postprocessor(
                postprocess::DenoModules::default().codegen(self.postprocess_options.deno_codegen),
            )
            .with_postprocessor(postprocess::PythonModules::default())
            .with_postprocessor(postprocess::WasmdegeModules::default());

        if self.postprocess_options.prisma_run_migrations {
            loader = loader.with_postprocessor(
                postprocess::EmbedPrismaMigrations::default()
                    .reset_on_drift(self.postprocess_options.allow_destructive)
                    .create_migration(self.postprocess_options.prisma_create_migration),
            );
        }

        loader
    }
}

pub enum ReloadReason {
    FileChanged,
    FileCreated,
    DependencyChanged(PathBuf),
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct LoadModule(pub PathBuf);

#[derive(Message)]
#[rtype(result = "()")]
pub struct ReloadModule(pub PathBuf, pub ReloadReason);

#[derive(Message)]
#[rtype(result = "()")]
pub struct TryStop(pub StopBehavior);

#[derive(Message)]
#[rtype(result = "()")]
struct SetStoppedTx(oneshot::Sender<StopBehavior>);

impl<W: Watcher + std::marker::Unpin + 'static> Actor for LoaderActor<W> {
    type Context = Context<Self>;

    #[cfg(debug_assertions)]
    fn started(&mut self, _ctx: &mut Self::Context) {
        log::trace!("loader started");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        if let Some(tx) = self.stopped_tx.take() {
            if let Err(e) = tx.send(self.stop_behavior) {
                warning!(self.console, "failed to send stop signal: {:?}", e);
            }
        }
    }
}

impl<W: Watcher + Unpin + 'static> Handler<LoadModule> for LoaderActor<W> {
    type Result = ();

    fn handle(&mut self, msg: LoadModule, _ctx: &mut Context<Self>) -> Self::Result {
        info!(self.console, "Loading module {:?}", msg.0);

        let loader = self.loader();
        let console = self.console.clone();
        let pusher = self.pusher.clone();
        Arbiter::current().spawn(async move {
            match Self::load_module(loader, &msg.0, pusher).await {
                Ok(_) => (),
                Err(e) => error!(console, "loader error: {:?}", e),
            }
        });
    }
}

impl Handler<ReloadModule> for WatchingLoaderActor {
    type Result = ();

    fn handle(&mut self, msg: ReloadModule, _ctx: &mut Context<Self>) -> Self::Result {
        let reason = match msg.1 {
            ReloadReason::FileChanged => "file changed".to_string(),
            ReloadReason::FileCreated => "file created".to_string(),
            ReloadReason::DependencyChanged(path) => format!("dependency changed: {:?}", path),
        };
        info!(self.console, "Reloading module {:?}: {reason}", msg.0);

        self.pusher.do_send(CancelPush(msg.0.clone()));

        let loader = self.loader();
        let console = self.console.clone();
        let pusher = self.pusher.clone();
        Arbiter::current().spawn(async move {
            match Self::load_module(loader, &msg.0, pusher).await {
                Ok(_) => (),
                Err(e) => error!(console, "loader error: {:?}", e),
            }
        });
    }
}

impl<W: Watcher + Unpin + 'static> Handler<TryStop> for LoaderActor<W> {
    type Result = ();

    fn handle(&mut self, msg: TryStop, ctx: &mut Context<Self>) -> Self::Result {
        if let StopBehavior::Restart = msg.0 {
            self.stop_behavior = StopBehavior::Restart;
        }
        self.watcher.stop();
        ctx.stop();

        // let self_addr = ctx.address();
        // Arbiter::current().spawn(async move {
        //     self.watcher.stop().await;
        //     self_addr.do_send(Stop);
        // });
    }
}

impl<W: Watcher + Unpin + 'static> Handler<SetStoppedTx> for LoaderActor<W> {
    type Result = ();

    fn handle(&mut self, msg: SetStoppedTx, _ctx: &mut Context<Self>) -> Self::Result {
        self.stopped_tx = Some(msg.0);
    }
}

pub fn stopped(addr: Addr<WatchingLoaderActor>) -> oneshot::Receiver<StopBehavior> {
    let (tx, rx) = oneshot::channel();
    addr.do_send(SetStoppedTx(tx));
    rx
}
