// Copyright Metatype under the Elastic License 2.0.

use crate::utils::ensure_venv;
use crate::{codegen, typegraph::TypegraphLoader};
use anyhow::{anyhow, Result};
use clap::{Parser, Subcommand};
use std::path::Path;

use super::Action;

#[derive(Parser, Debug)]
pub struct Codegen {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// deno codegen
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
    fn run(&self, dir: String) -> Result<()> {
        ensure_venv(&dir)?;
        let loaded = TypegraphLoader::new()
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
