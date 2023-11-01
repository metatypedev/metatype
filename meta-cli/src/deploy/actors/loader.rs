// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;

use actix::prelude::Context;
use actix::prelude::*;

use crate::config::Config;
use crate::deploy::actors::pusher::CancelPush;
use crate::typegraph::loader::{Loader, LoaderError};

use super::console::{error, info, ConsoleActor};
use super::pusher::{Push, PusherActor};

pub struct LoaderActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
    pusher: Addr<PusherActor>,
}

impl LoaderActor {
    pub fn new(
        config: Arc<Config>,
        console: Addr<ConsoleActor>,
        pusher: Addr<PusherActor>,
    ) -> Self {
        Self {
            config,
            console,
            pusher,
        }
    }

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
        // .with_postprocessor(postprocess::DenoModules::default().codegen(true));
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

impl Actor for LoaderActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Context<Self>) {
        log::info!("loader started");
    }

    fn stopped(&mut self, _ctx: &mut Context<Self>) {
        log::info!("loader stopped");
    }
}

impl Handler<LoadModule> for LoaderActor {
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

impl Handler<ReloadModule> for LoaderActor {
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
