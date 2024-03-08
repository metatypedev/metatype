// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use super::{Action, GenArgs};
use anyhow::Result;
use async_trait::async_trait;
use clap::{Parser, Subcommand};

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
    /// Typegraph definition module
    #[clap(short, long, value_parser)]
    file: PathBuf,
    //
    // #[clap(short, long, value_parser)]
    // typegraph: Option<String>,
}

#[async_trait]
impl Action for Deno {
    async fn run(&self, _args: GenArgs) -> Result<()> {
        // TODO:
        // how does this fit with the current impl?

        // let dir = args.dir()?;
        // // try to find config file, else use default config as the options
        // // used for code generation have default values.
        // let config = Arc::new(
        //     Config::load_or_find(args.config, &dir).unwrap_or_else(|_| Config::default_in(&dir)),
        // );

        // let loader_pool = LoaderPool::new(config, 1);

        // let loader = loader_pool.get_loader().await?;

        // let file: Arc<Path> = self.file.clone().into();
        // loader.load_module(file.clone()).await.map_err(|e| {
        //     anyhow!(
        //         "An error occured while loading typegraphs from the {:?}: {}",
        //         file,
        //         e.to_string()
        //     )
        // })?;

        Ok(())
    }
}
