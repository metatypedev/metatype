// Copyright Metatype under the Elastic License 2.0.

use super::{dev::push_typegraph, Action};
use crate::utils::ensure_venv;
use crate::{typegraph::TypegraphLoader, utils::BasicAuth};
use anyhow::{Ok, Result};
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Deploy {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Typegate url
    #[clap(short, long, value_parser, default_value_t = String::from("http://localhost:7890"))]
    gate: String,
}

impl Action for Deploy {
    fn run(&self, dir: String) -> Result<()> {
        ensure_venv(&dir)?;
        let loader = TypegraphLoader::new();
        let tgs = match &self.file {
            Some(file) => loader.load_file(file)?,
            None => loader.load_folder(&dir)?,
        };

        for (name, tg) in tgs {
            println!("Pushing {}", name);
            push_typegraph(tg, &self.gate, &BasicAuth::prompt()?, 3)?;
            println!("> Added {}", name);
        }

        Ok(())
    }
}
