use crate::utils::ensure_venv;
use crate::{codegen, typegraph::TypegraphLoader};
use anyhow::Result;
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
        let mut tgs = TypegraphLoader::new().load_file(&self.file)?;
        let file = Path::new(&self.file);

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.remove(tg_name) {
                codegen::deno::codegen(tg, file)?;
            } else {
                panic!("typegraph not found: {tg_name}")
            }
        } else {
            for (_tg_name, tg) in tgs {
                codegen::deno::codegen(tg, file)?;
            }
        }

        Ok(())
    }
}
