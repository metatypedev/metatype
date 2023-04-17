// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::PathBuf;
use std::sync::Arc;

use crate::typegraph::loader::{Loader, LoaderResult};
use crate::utils::ensure_venv;
use crate::{config::Config, typegraph::postprocess};
use anyhow::{bail, Result};
use async_trait::async_trait;
use clap::{Parser, Subcommand};
use log::warn;

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
        ensure_venv(&dir)?;
        let loader = Loader::new(config)
            .skip_deno_modules(true)
            .with_postprocessor(postprocess::DenoModules::default().codegen(true));

        match loader.load_file(&self.file).await {
            LoaderResult::Loaded(_) => {
                // ok
            }
            LoaderResult::Rewritten(_) => {
                warn!("Typegraph definition module has been rewritten");
                bail!("Typegraph definition module has been rewritten");
            }
            LoaderResult::Error(e) => {
                bail!(
                    "An error occured while loading typegraphs from the {:?}: {}",
                    self.file,
                    e.to_string()
                );
            }
        }

        Ok(())
    }
}
