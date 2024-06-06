// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{Action, ConfigArgs};
use crate::com::store::{Command, ServerStore};
use crate::config::Config;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::task::serialize::{
    SerializeAction, SerializeActionGenerator, SerializeError,
};
use crate::deploy::actors::task::{TaskConfig, TaskFinishStatus};
use crate::deploy::actors::task_manager::{TaskManagerInit, TaskSource};
use crate::interlude::*;
use actix_web::dev::ServerHandle;
use clap::Parser;
use core::fmt::Debug;
use std::io::{self, Write};
use tokio::io::AsyncWriteExt;

#[derive(Parser, Debug)]
pub struct Serialize {
    /// The python source file that defines the typegraph(s).
    /// Default: All the python files descending from the current directory.
    #[clap(short, long = "file", value_parser)]
    files: Vec<PathBuf>,

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

    #[clap(short, long)]
    prefix: Option<String>,

    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

#[async_trait]
impl Action for Serialize {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
        let dir = args.dir();
        let config_path = args.config.clone();

        // config file is not used when `TypeGraph` files
        // are provided in the CLI by flags
        let config = if !self.files.is_empty() {
            Config::default_in(&dir)
        } else {
            Config::load_or_find(config_path, &dir)?
        };

        // Minimum setup
        ServerStore::with(Some(Command::Serialize), Some(config.to_owned()));
        ServerStore::set_prefix(self.prefix.to_owned());

        let config = Arc::new(config);

        let console = ConsoleActor::new(Arc::clone(&config)).start();

        let action_generator = SerializeActionGenerator::new(TaskConfig::init(args.dir().into()));

        if self.files.is_empty() {
            bail!("no file provided");
        }

        // TODO fail_fast
        let mut init = TaskManagerInit::<SerializeAction>::new(
            config.clone(),
            action_generator,
            console,
            TaskSource::Static(self.files.clone()),
        );
        if let Some(max_parallel_tasks) = self.max_parallel_loads {
            init = init.max_parallel_tasks(max_parallel_tasks);
        }

        let report = init.run().await;

        // TODO no need to report errors
        let tgs = report
            .entries
            .into_iter()
            .map(|entry| match entry.status {
                TaskFinishStatus::Finished(results) => results
                    .into_iter()
                    .collect::<Result<Vec<_>, SerializeError>>()
                    .map_err(|e| {
                        eyre::eyre!(
                            "serialization failed for typegraph '{}' at {:?}: {}",
                            e.typegraph,
                            entry.path,
                            e.error
                        )
                    }),
                TaskFinishStatus::Cancelled => {
                    Err(eyre::eyre!("serialization cancelled for {:?}", entry.path))
                }
                TaskFinishStatus::Error => {
                    Err(eyre::eyre!("serialization failed for {:?}", entry.path))
                }
            })
            .collect::<Result<Vec<_>>>()?
            .into_iter()
            .flatten()
            .collect::<Vec<_>>();

        if let Some(tg_name) = self.typegraph.as_ref() {
            if let Some(tg) = tgs.iter().find(|tg| &tg.name().unwrap() == tg_name) {
                self.write(&self.to_string(&tg)?).await?;
            } else {
                let suggestions = tgs
                    .iter()
                    .map(|tg| tg.name().unwrap())
                    .collect::<Vec<_>>()
                    .join(", ");
                bail!("typegraph {tg_name:?} not found; available typegraphs are: {suggestions}",);
            }
        } else if self.unique {
            if tgs.len() == 1 {
                self.write(&self.to_string(&tgs[0])?).await?;
            } else {
                bail!("expected only one typegraph, got {}", tgs.len());
            }
        } else {
            self.write(&self.to_string(&tgs)?).await?;
        }

        server_handle.unwrap().stop(true).await;

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
                .context("could not open file")?
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
