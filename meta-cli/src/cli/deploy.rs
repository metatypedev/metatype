use super::{dev::push_typegraph, Action};
use crate::typegraph::TypegraphLoader;
use anyhow::{Ok, Result};
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Deploy {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Typegate url
    #[clap(short, long, value_parser, default_value_t = String::from("localhost:7890"))]
    gate: String,
}

impl Action for Deploy {
    fn run(&self, dir: String) -> Result<()> {
        let loader = TypegraphLoader::new().serialized();
        let tgs = match &self.file {
            Some(file) => loader.load_file(file)?,
            None => loader.load_folder(&dir)?,
        };

        for (name, tg) in tgs {
            println!("Pushing {}", name);
            push_typegraph(tg, self.gate.clone(), 3)?;
            println!("> Added {}", name);
        }

        Ok(())
    }
}
