// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;
use std::sync::Arc;

use crate::cli::{Action, ConfigArgs};
use crate::com::store::ServerStore;
use crate::config::Config;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::loader::{LoadModule, LoaderActor, LoaderEvent, StopBehavior};
use actix::Actor;
use actix_web::dev::ServerHandle;
use anyhow::{bail, Result};
use async_trait::async_trait;
use clap::{Parser, Subcommand};

#[derive(Parser, Debug, Clone)]
pub struct Codegen {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    /// Generate materializer code for Deno runtime
    Deno(Deno),
}

#[async_trait]
impl Action for Codegen {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        match &self.command {
            Commands::Deno(deno) => {
                deno.run(args, server_handle).await?;
            }
        }
        Ok(())
    }
}

#[derive(Parser, Debug, Clone)]
pub struct Deno {
    /// Typegraph definition module
    #[clap(short, long, value_parser)]
    file: PathBuf,
    //
    // #[clap(short, long, value_parser)]
    // typegraph: Option<String>,
}

#[async_trait]
impl Action for Deno {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        let dir = args.dir()?;
        // try to find config file, else use default config as the options
        // used for code generation have default values.
        let config = Arc::new(
            Config::load_or_find(args.config, &dir).unwrap_or_else(|_| Config::default_in(&dir)),
        );
        let file: Arc<PathBuf> = self.file.clone().into();

        let (tx, _rx) = tokio::sync::oneshot::channel();

        tokio::task::spawn_blocking(move || {
            actix::run(async move {
                let res = exec_codegen(config, file).await;
                tx.send(res).unwrap();
            })
        })
        .await??;

        server_handle.unwrap().stop(true).await;
        Ok(())
    }
}

async fn exec_codegen(config: Arc<Config>, file: Arc<PathBuf>) -> anyhow::Result<()> {
    ServerStore::with(
        Some(crate::com::store::Command::Serialize),
        Some(config.as_ref().clone()),
    );
    ServerStore::set_codegen_flag(true); // !

    let console = ConsoleActor::new(Arc::clone(&config)).start();

    let (loader_event_tx, loader_event_rx) = tokio::sync::mpsc::unbounded_channel();
    let loader = LoaderActor::new(Arc::clone(&config), console.clone(), loader_event_tx, 1)
        .auto_stop()
        .start();

    loader.do_send(LoadModule(file));
    let mut event_rx = loader_event_rx;
    while let Some(event) = event_rx.recv().await {
        match event {
            LoaderEvent::Typegraph(tg_infos) => {
                let responses = ServerStore::get_responses_or_fail(&tg_infos.path)?;
                for (_, res) in responses.iter() {
                    res.codegen()?;
                }
            }
            LoaderEvent::Stopped(b) => {
                if let StopBehavior::ExitFailure(e) = b {
                    bail!(e);
                }
            }
        }
    }

    Ok(())
}
