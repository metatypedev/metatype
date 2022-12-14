// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::Action;
use crate::config::Config;
use crate::typegraph::TypegraphLoader;
use crate::utils::ensure_venv;
use anyhow::bail;
use anyhow::{Context, Result};
use clap::Parser;
use core::fmt::Debug;
use std::cell::Cell;
use std::fs::File;
use std::io::{self, Write};
use std::ops::Deref;
use std::path::{Path, PathBuf};

#[derive(Default)]
struct Writer(Cell<Option<Box<dyn Write>>>);

impl Debug for Writer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Writer")
    }
}

impl Deref for Writer {
    type Target = Cell<Option<Box<dyn Write>>>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Parser, Debug)]
pub struct Serialize {
    /// The python source file that defines the typegraph(s).
    /// Default: All the python files descending from the current directory.
    #[clap(short, long = "file", value_parser)]
    files: Vec<String>,

    /// Name of the typegraph to serialize.
    #[clap(short, long, value_parser)]
    typegraph: Option<String>,

    /// Serialize only one typegraph. Error if more than one are defined.
    #[clap(short = '1', value_parser, default_value_t = false)]
    unique: bool,

    /// The output file. Default: stdout
    #[clap(short, long, value_parser)]
    out: Option<String>,

    #[clap(skip)]
    writer: Writer,
}

impl Action for Serialize {
    fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;
        let loader = TypegraphLoader::with_config(&config);
        let files: Vec<_> = self.files.iter().map(|f| Path::new(f).to_owned()).collect();
        let loaded = if !self.files.is_empty() {
            loader.load_files(&files)
        } else {
            loader.load_folder(&dir)?
        };

        let tgs: Vec<_> = loaded
            .into_values()
            .collect::<Result<Vec<_>>>()?
            .into_iter()
            .flatten()
            .collect();

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.into_iter().find(|tg| &tg.name().unwrap() == tg_name) {
                self.write(&serde_json::to_string(&tg)?)?;
            } else {
                bail!("typegraph \"{}\" not found", tg_name);
            }
        } else if self.unique {
            if tgs.len() == 1 {
                self.write(&serde_json::to_string(&tgs[0])?)?;
            } else {
                eprint!("expected only one typegraph, got {}", tgs.len());
                std::process::exit(1);
            }
        } else {
            self.write(&serde_json::to_string(&tgs)?)?;
        }

        self.write("\n")?;
        Ok(())
    }
}

impl Serialize {
    fn write(&self, contents: &str) -> Result<()> {
        if let Some(mut writer) = self.writer.take() {
            writer.write_all(contents.as_bytes())?;
            self.writer.set(Some(writer));
            Ok(())
        } else {
            if let Some(path) = self.out.as_ref() {
                let file = File::options()
                    .truncate(true)
                    .write(true)
                    .open(path)
                    .context("Could not open file")?;
                self.writer.set(Some(Box::new(file)));
            } else {
                self.writer.set(Some(Box::new(io::stdout())));
            }
            self.write(contents)
        }
    }
}
