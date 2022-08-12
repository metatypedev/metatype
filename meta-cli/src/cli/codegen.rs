use crate::codegen;
use anyhow::Result;
use clap::{Parser, Subcommand};

use super::{dev::collect_typegraphs, Action};

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
        let tgs = collect_typegraphs(
            dir,
            Some(format!(r#"loaders.import_file("{}")"#, self.file)),
            true,
        )?;

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.get(tg_name) {
                codegen::apply(tg);
            } else {
                panic!("typegraph not found: {tg_name}")
            }
        } else {
            for (_tg_name, tg) in tgs {
                codegen::apply(&tg);
            }
        }

        Ok(())
    }
}
