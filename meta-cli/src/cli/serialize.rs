// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, GenArgs};
use crate::config::Config;
use crate::typegraph::{postprocess, TypegraphLoader};
use crate::utils::ensure_venv;
use anyhow::bail;
use anyhow::{Context, Result};
use async_trait::async_trait;
use clap::Parser;
use core::fmt::Debug;
use std::io::{self, Write};
use std::path::Path;
use tokio::io::AsyncWriteExt;

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

    #[clap(long, default_value_t = false)]
    pretty: bool,

    /// simulate serializing the typegraph for deployment
    #[clap(long, default_value_t = false)]
    deploy: bool,
}

#[async_trait]
impl Action for Serialize {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = args.dir;
        let config_path = args.config;
        ensure_venv(&dir)?;

        // config file is not used when `TypeGraph` files
        // are provided in the CLI by flags
        let config = if !self.files.is_empty() {
            Config::default_in(&dir)
        } else {
            Config::load_or_find(config_path, &dir)?
        };

        let loader = TypegraphLoader::with_config(&config);
        let loader = if self.deploy {
            loader.with_postprocessor(postprocess::prisma_rt::EmbedPrismaMigrations::default())
        } else {
            loader
        };

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

        if tgs.is_empty() {
            eprintln!("No typegraph!");
            return Ok(());
        }

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.into_iter().find(|tg| &tg.name().unwrap() == tg_name) {
                self.write(&self.to_string(&tg)?).await?;
            } else {
                bail!("typegraph \"{}\" not found", tg_name);
            }
        } else if self.unique {
            if tgs.len() == 1 {
                self.write(&self.to_string(&tgs[0])?).await?;
            } else {
                eprintln!("expected only one typegraph, got {}", tgs.len());
                std::process::exit(1);
            }
        } else {
            self.write(&self.to_string(&tgs)?).await?;
        }

        Ok(())
    }
}

impl Serialize {
    async fn write(&self, contents: &str) -> Result<()> {
        if let Some(path) = self.out.as_ref() {
            tokio::fs::OpenOptions::new()
                .truncate(true)
                .create(true)
                .write(true)
                .open(path)
                .await
                .context("Could not open file")?
                .write_all(contents.as_bytes())
                .await?;
        } else {
            io::stdout().write_all(contents.as_bytes())?;
        };
        Ok(())
    }

    fn to_string<T: serde::Serialize>(&self, val: &T) -> serde_json::Result<String> {
        if self.pretty {
            serde_json::to_string_pretty(val)
        } else {
            serde_json::to_string(val)
        }
    }
}
