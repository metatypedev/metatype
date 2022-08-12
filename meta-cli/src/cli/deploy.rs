use clap::Parser;

use anyhow::{Ok, Result};

use super::{
    dev::{collect_typegraphs, push_typegraph},
    Action,
};

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
        let loader = match &self.file {
            Some(file) => format!(r#"loaders.import_file("{}")"#, file),
            None => r#"loaders.import_folder(".")"#.to_string(),
        };
        let tgs = collect_typegraphs(dir, Some(loader), false)?;

        for tg in tgs {
            println!("Pushing {}", tg.0);
            push_typegraph(tg.1, self.gate.clone(), 3)?;
            println!("> Added {}", tg.0);
        }

        Ok(())
    }
}
