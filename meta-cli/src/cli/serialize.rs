use clap::Parser;

use super::{dev::collect_typegraphs, Action};
use anyhow::anyhow;
use anyhow::Result;
#[derive(Parser, Debug)]
pub struct Serialize {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    typegraph: String,
}

impl Action for Serialize {
    fn run(&self, dir: String) -> Result<()> {
        let loader = match &self.file {
            Some(file) => format!(r#"loaders.import_file("{}")"#, file),
            None => r#"loaders.import_folder(".")"#.to_string(),
        };
        let tgs = collect_typegraphs(dir, Some(loader))?;

        for (tg_name, tg) in tgs {
            if tg_name == self.typegraph {
                println!("{}", tg);
            } else {
                return Err(anyhow!("typegraph {} not found", tg_name));
            }
        }

        Ok(())
    }
}
