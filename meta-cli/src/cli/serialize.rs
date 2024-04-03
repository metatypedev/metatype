// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Action, ConfigArgs};
use crate::com::store::{Command, ServerStore};
use crate::config::Config;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::loader::{LoadModule, LoaderActor, LoaderEvent, StopBehavior};
use actix::prelude::*;
use actix_web::dev::ServerHandle;
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use clap::Parser;
use common::typegraph::Typegraph;
use core::fmt::Debug;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::sync::mpsc;

#[derive(Parser, Debug)]
pub struct Serialize {
    /// The python source file that defines the typegraph(s).
    /// Default: All the python files descending from the current directory.
    #[clap(short, long = "file", value_parser)]
    files: Vec<PathBuf>,

    /// Name of the typegraph to serialize.
    #[clap(short, long, value_parser)]
    typegraph: Option<String>,

    /// Serialize only one typegraph. Error if more than one are defined.
    #[clap(short = '1', value_parser, default_value_t = false)]
    unique: bool,

    /// The output file. Default: stdout
    #[clap(short, long, value_parser)]
    out: Option<String>,

    #[clap(long, default_value_t = false)]
    pretty: bool,

    /// simulate serializing the typegraph for deployment
    #[clap(long, default_value_t = false)]
    deploy: bool,

    #[clap(short, long)]
    prefix: Option<String>,

    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

#[async_trait]
impl Action for Serialize {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        let dir = &args.dir()?;
        let config_path = args.config;

        // config file is not used when `TypeGraph` files
        // are provided in the CLI by flags
        let config = if !self.files.is_empty() {
            Config::default_in(dir)
        } else {
            Config::load_or_find(config_path, dir)?
        };

        // Minimum setup
        ServerStore::with(Some(Command::Serialize), Some(config.to_owned()));
        ServerStore::set_prefix(self.prefix.to_owned());

        let config = Arc::new(config);

        let console = ConsoleActor::new(Arc::clone(&config)).start();

        let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

        let loader = LoaderActor::new(
            Arc::clone(&config),
            console.clone(),
            loader_event_tx,
            self.max_parallel_loads.unwrap_or_else(num_cpus::get),
        )
        .auto_stop()
        .start();

        if self.files.is_empty() {
            bail!("No file provided");
        }

        for path in self.files.iter() {
            loader.do_send(LoadModule(dir.join(path).into()));
        }

        let mut loaded: Vec<Typegraph> = vec![];
        let mut event_rx = loader_event_rx;
        while let Some(event) = event_rx.recv().await {
            match event {
                LoaderEvent::Typegraph(tg_infos) => {
                    let tgs = ServerStore::get_responses_or_fail(&tg_infos.path)?;
                    for (_, tg) in tgs.iter() {
                        loaded.push(tg.as_typegraph()?);
                    }
                }
                LoaderEvent::Stopped(b) => {
                    log::debug!("event: {b:?}");
                    if let StopBehavior::ExitFailure(e) = b {
                        bail!(e);
                    }
                }
            }
        }

        let tgs = loaded;
        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.iter().find(|tg| &tg.name().unwrap() == tg_name) {
                self.write(&self.to_string(&tg)?).await?;
            } else {
                let suggestions = tgs
                    .iter()
                    .map(|tg| tg.name().unwrap())
                    .collect::<Vec<_>>()
                    .join(", ");
                bail!(
                    "typegraph \"{}\" not found; available typegraphs are: {suggestions}",
                    tg_name
                );
            }
        } else if self.unique {
            if tgs.len() == 1 {
                self.write(&self.to_string(&tgs[0])?).await?;
            } else {
                bail!("expected only one typegraph, got {}", tgs.len());
            }
        } else {
            self.write(&self.to_string(&tgs)?).await?;
        }

        server_handle.unwrap().stop(true).await;

        Ok(())
    }
}

impl Serialize {
    async fn write(&self, contents: &str) -> Result<()> {
        if let Some(path) = self.out.as_ref() {
            tokio::fs::OpenOptions::new()
                .truncate(true)
                .create(true)
                .write(true)
                .open(path)
                .await
                .context("Could not open file")?
                .write_all(contents.as_bytes())
                .await?;
        } else {
            io::stdout().write_all(contents.as_bytes())?;
        };
        Ok(())
    }

    fn to_string<T: serde::Serialize>(&self, val: &T) -> serde_json::Result<String> {
        if self.pretty {
            serde_json::to_string_pretty(val)
        } else {
            serde_json::to_string(val)
        }
    }
}
