// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::config::Config;
use crate::utils::ensure_venv;
use crate::{codegen, typegraph::TypegraphLoader};
use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};

use super::Action;

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

#[derive(Parser, Debug)]
pub struct Deno {
    #[clap(short, long, value_parser)]
    file: String,

    #[clap(short, long, value_parser)]
    typegraph: Option<String>,
}

impl Action for Deno {
    fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        ensure_venv(&dir)?;
        // try to find config file, else use default config as the options
        // used for code generation have default values.
        let config =
            Config::load_or_find(config_path, &dir).unwrap_or_else(|_| Config::default_in(&dir));

        let loaded = TypegraphLoader::with_config(&config)
            .skip_deno_modules()
            .load_file(&self.file)?;
        let file = Path::new(&self.file);

        let tgs = loaded.ok_or_else(|| anyhow!("unexpected"))?;

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.into_iter().find(|tg| &tg.name().unwrap() == tg_name) {
                codegen::deno::codegen(tg, file)?;
            } else {
                panic!("typegraph not found: {tg_name}")
            }
        } else {
            for tg in tgs {
                codegen::deno::codegen(tg, file)?;
            }
        }

        Ok(())
    }
}
