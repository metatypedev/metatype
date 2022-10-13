// Copyright Metatype under the Elastic License 2.0.

use super::Action;
use crate::typegraph::TypegraphLoader;
use crate::utils::ensure_venv;
use anyhow::bail;
use anyhow::Result;
use clap::Parser;
use std::fs;
use std::io::{self, Write};

#[derive(Parser, Debug)]
pub struct Serialize {
    /// The python source file that defines the typegraph(s).
    /// Default: All the python files descending from the current directory.
    #[clap(short, long, value_parser)]
    file: Option<String>,

    /// Name of the typegraph to serialize.
    /// Default: the resulted JSON contains an object
    /// that maps the typegraph name to the serialized typegraph.
    #[clap(short, long, value_parser)]
    typegraph: Option<String>,

    /// Serialize only one typegraph. Error if more than one are defined.
    #[clap(short = '1', value_parser, default_value_t = false)]
    unique: bool,

    /// The output file. Default: stdout
    #[clap(short, long, value_parser)]
    out: Option<String>,
}

impl Action for Serialize {
    fn run(&self, dir: String) -> Result<()> {
        ensure_venv(&dir)?;
        let loader = TypegraphLoader::new().serialized();
        let tgs = match &self.file {
            Some(file) => loader.load_file(file)?,
            None => loader.load_folder(&dir)?,
        };

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.get(tg_name) {
                self.write(&tg.to_string());
            } else {
                bail!("typegraph \"{}\" not found", tg_name);
            }
        } else if self.unique {
            if tgs.len() == 1 {
                let tg = tgs.into_values().next().unwrap();
                self.write(&tg);
            } else {
                eprint!("expected only one typegraph, got {}", tgs.len());
                std::process::exit(1);
            }
        } else {
            let entries = tgs
                .iter()
                .map(|(tg_name, tg)| format!("\"{tg_name}\": {tg}"))
                .collect::<Vec<_>>()
                .join(",\n");
            self.write(&format!("{{{entries}}}"));
        }

        Ok(())
    }
}

impl Serialize {
    fn write(&self, contents: &str) {
        if let Some(path) = self.out.as_ref() {
            fs::write(path, contents).unwrap();
        } else {
            io::stdout().write_all(contents.as_bytes()).unwrap();
        }
    }
}
