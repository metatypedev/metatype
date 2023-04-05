// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::typegraph::loader::Loader;
use crate::utils::ensure_venv;
use crate::{config::Config, typegraph::loader::LoaderOptions};
use anyhow::Result;
use async_trait::async_trait;
use clap::{Parser, Subcommand};

use super::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Codegen {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Generate materializer code for Deno runtime
    Deno(Deno),
}

#[async_trait]
impl Action for Codegen {
    async fn run(&self, args: GenArgs) -> Result<()> {
        match &self.command {
            Commands::Deno(deno) => {
                deno.run(args).await?;
            }
        }
        Ok(())
    }
}

#[derive(Parser, Debug)]
pub struct Deno {
    #[clap(short, long, value_parser)]
    file: String,

    #[clap(short, long, value_parser)]
    typegraph: Option<String>,
}

#[async_trait]
impl Action for Deno {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = args.dir;
        let config_path = args.config;
        ensure_venv(&dir)?;
        // try to find config file, else use default config as the options
        // used for code generation have default values.
        let config =
            Config::load_or_find(config_path, &dir).unwrap_or_else(|_| Config::default_in(&dir));
        eprintln!("loaded config file");

        let mut loader_options = LoaderOptions::with_config(&config);
        loader_options.codegen();
        if let Some(tg_name) = self.typegraph.as_ref() {
            loader_options.typegraph(&self.file, tg_name);
        } else {
            loader_options.file(&self.file);
        }

        let mut loader = Loader::from(loader_options);
        eprintln!("entering loop");
        while loader.next().await.is_some() {
            // no-op
            eprintln!("got an item from the loader");
        }

        Ok(())
    }
}
