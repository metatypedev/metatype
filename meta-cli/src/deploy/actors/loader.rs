// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;

use actix::prelude::Context;
use actix::prelude::*;
use async_trait::async_trait;
use common::typegraph::Typegraph;

use crate::config::Config;
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

#[async_trait]
impl Watcher for Addr<WatcherActor> {
    fn update_deps(&mut self, tg: Arc<Typegraph>) {
        self.do_send(UpdateDependencies(tg));
    }

    fn stop(&self) {
        // TODO wait for watcher to stop
        self.do_send(watcher::Stop);
    }
}

pub struct LoaderActor<W: Watcher = NoWatch> {
    config: Arc<Config>,
    directory: Arc<Path>,
    console: Addr<ConsoleActor>,
    pusher: Addr<PusherActor>,
    watcher: W,
}

impl LoaderActor {
    pub fn new(
        config: Arc<Config>,
        directory: Arc<Path>,
        console: Addr<ConsoleActor>,
        pusher: Addr<PusherActor>,
    ) -> Self {
        Self {
            config,
            directory,
            console,
            pusher,
            watcher: NoWatch,
        }
    }

    pub fn start_in_watch_mode(self) -> Addr<LoaderActor<Addr<WatcherActor>>> {
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
                console: self.console,
                pusher: self.pusher,
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
        Loader::new(Arc::clone(&self.config))
            // .skip_deno_modules(true)
            .with_postprocessor(postprocess::DenoModules::default().codegen(true))
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
pub struct Stop;

impl<W: Watcher + std::marker::Unpin + 'static> Actor for LoaderActor<W> {
    type Context = Context<Self>;
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

impl Handler<ReloadModule> for LoaderActor<Addr<WatcherActor>> {
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

impl<W: Watcher + Unpin + 'static> Handler<Stop> for LoaderActor<W> {
    type Result = ();

    fn handle(&mut self, _msg: Stop, ctx: &mut Context<Self>) -> Self::Result {
        self.watcher.stop();
        ctx.stop();

        // let self_addr = ctx.address();
        // Arbiter::current().spawn(async move {
        //     self.watcher.stop().await;
        //     self_addr.do_send(Stop);
        // });
    }
}
