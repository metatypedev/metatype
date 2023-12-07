// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use crate::typegraph::loader::Loader;
use crate::{config::Config, typegraph::postprocess};
use anyhow::{anyhow, Result};
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
    /// Typegraph definition module
    #[clap(short, long, value_parser)]
    file: PathBuf,
    //
    // #[clap(short, long, value_parser)]
    // typegraph: Option<String>,
}

#[async_trait]
impl Action for Deno {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = args.dir()?;
        // try to find config file, else use default config as the options
        // used for code generation have default values.
        let config = Arc::new(
            Config::load_or_find(args.config, &dir).unwrap_or_else(|_| Config::default_in(&dir)),
        );

        let loader = Loader::new(config)
            .skip_deno_modules(true)
            .with_postprocessor(postprocess::DenoModules::default().codegen(true))
            .with_postprocessor(postprocess::PythonModules::default())
            .with_postprocessor(postprocess::WasmdegeModules::default());

        let file: Arc<Path> = self.file.clone().into();
        loader.load_module(file.clone()).await.map_err(|e| {
            anyhow!(
                "An error occured while loading typegraphs from the {:?}: {}",
                file,
                e.to_string()
            )
        })?;

        Ok(())
    }
}
