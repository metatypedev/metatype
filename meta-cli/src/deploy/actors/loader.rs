// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;

use actix::prelude::Context as ActixContext;
use actix::prelude::*;

use crate::config::Config;
use crate::typegraph::loader::{Loader, LoaderError};

use super::console::{error, ConsoleActor};

pub struct LoaderActor {
    config: Arc<Config>,
    console: Addr<ConsoleActor>,
}

impl LoaderActor {
    pub fn new(config: Arc<Config>, console: Addr<ConsoleActor>) -> Self {
        Self { config, console }
    }

    async fn handle_load_module(loader: Loader, path: &Path) -> Result<(), LoaderError> {
        let _result = loader.load_module(path).await?;
        // TODO push
        Ok(())
    }
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct LoadModule(pub PathBuf);

impl Actor for LoaderActor {
    type Context = ActixContext<Self>;

    fn started(&mut self, _ctx: &mut ActixContext<Self>) {
        log::info!("loader started");
    }

    fn stopped(&mut self, _ctx: &mut ActixContext<Self>) {
        log::info!("loader stopped");
    }
}

impl Handler<LoadModule> for LoaderActor {
    type Result = ();

    fn handle(&mut self, msg: LoadModule, _ctx: &mut ActixContext<Self>) -> Self::Result {
        let config = Arc::clone(&self.config);
        let loader = Loader::new(config);
        let console = self.console.clone();
        // .skip_deno_modules(true)
        // .with_postprocessor(postprocess::DenoModules::default().codegen(true));
        Arbiter::current().spawn(async move {
            match Self::handle_load_module(loader, &msg.0).await {
                Ok(_) => (),
                // TODO send to console
                Err(e) => error!(console, "loader error: {:?}", e),
            }
        });
    }
}
