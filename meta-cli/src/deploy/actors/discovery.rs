// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use actix::prelude::*;
use pathdiff::diff_paths;
use std::path::Path;
use std::sync::Arc;

use crate::deploy::actors::console::trace;
use crate::{config::Config, typegraph::loader::Discovery};

use super::console::{error, info, ConsoleActor};
use super::loader::{LoadModule, LoaderActor, Watcher};

pub struct DiscoveryActor<W: Watcher + Unpin + 'static> {
    config: Arc<Config>,
    loader: Addr<LoaderActor<W>>,
    console: Addr<ConsoleActor>,
    directory: Arc<Path>,
}

impl<W: Watcher + Unpin + 'static> DiscoveryActor<W> {
    pub fn new(
        config: Arc<Config>,
        loader: Addr<LoaderActor<W>>,
        console: Addr<ConsoleActor>,
        directory: Arc<Path>,
    ) -> Self {
        Self {
            config,
            loader,
            console,
            directory,
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct Stop;

impl<W: Watcher + Unpin + 'static> Actor for DiscoveryActor<W> {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        trace!(self.console, "DiscoveryActor started");

        let config = Arc::clone(&self.config);
        let dir = self.directory.clone();
        let loader = self.loader.clone();
        let console = self.console.clone();
        let discovery = ctx.address();
        Arbiter::current().spawn(async move {
            match Discovery::new(config, dir.to_path_buf())
                .start(|path| match path {
                    Ok(path) => {
                        let rel_path = diff_paths(&path, &dir).unwrap();
                        info!(
                            console,
                            "Found typegraph definition module at {}",
                            rel_path.display()
                        );
                        loader.do_send(LoadModule(path));
                    }
                    Err(err) => error!(console, "Error while discovering modules: {}", err),
                })
                .await
            {
                Ok(_) => (),
                Err(err) => error!(console, "Error while discovering modules: {}", err),
            }

            discovery.do_send(Stop);
        });
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        trace!(self.console, "DiscoveryActor stopped");
    }
}

impl<W: Watcher + Unpin + 'static> Handler<Stop> for DiscoveryActor<W> {
    type Result = ();

    fn handle(&mut self, msg: Stop, ctx: &mut Self::Context) -> Self::Result {
        match msg {
            Stop => ctx.stop(),
        }
    }
}
