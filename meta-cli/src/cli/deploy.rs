// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::loader::{Loader, LoaderError, LoaderOptions, LoaderOutput};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::{PushLoopBuilder, PushQueueEntry};
use crate::utils::ensure_venv;
use anyhow::{bail, Result};
use async_trait::async_trait;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Deploy {
    #[command(flatten)]
    node: CommonArgs,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<String>,

    /// Do not run prisma migrations
    #[clap(long, default_value_t = false)]
    no_migrations: bool,

    // TODO incompatible with --no-migrations
    /// Allow deployment on dirty (git) repository
    #[clap(long, default_value_t = false)]
    allow_dirty: bool,

    #[clap(long, default_value_t = false)]
    run_destructive_migrations: bool,
    // TODO exit_on_error
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = args.dir;
        let config_path = args.config;
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;

        let mut loader_options = LoaderOptions::with_config(&config);
        if !self.no_migrations {
            loader_options.with_postprocessor(
                EmbedPrismaMigrations::default()
                    .allow_dirty(self.allow_dirty)
                    .reset_on_drift(self.run_destructive_migrations),
            );
        }
        if let Some(file) = self.file.clone() {
            loader_options.file(&file);
        } else {
            loader_options.dir(&dir);
        }
        let mut loader: Loader = loader_options.into();
        let mut push_queue_init = vec![];

        while let Some(output) = loader.next().await {
            match output {
                LoaderOutput::Typegraph(typegraph) => {
                    push_queue_init.push(PushQueueEntry::new(typegraph))
                }
                LoaderOutput::Rewritten(path) => {
                    println!("Typegraph definition module at {path:?} has been rewritten by an importer.");
                }
                LoaderOutput::Error(LoaderError::PostProcessingError {
                    path,
                    typegraph_name,
                    error,
                }) => {
                    bail!("Error while post processing typegraph {typegraph_name:?} from {path:?}: {error:?}");
                    // bail!(error.with_context(|| format!(
                    //     "Postprocessing typegraph {typegraph_name:?} from {path:?}"
                    // )));
                }
                LoaderOutput::Error(LoaderError::UnknownFileType(path)) => {
                    // TODO command option
                    println!("Unknown file type: {path:?}");
                }
                LoaderOutput::Error(LoaderError::SerdeJson { path, error }) => {
                    bail!("Error while parsing raw string format of the typegraph from {path:?}: {error:?}");
                }
                LoaderOutput::Error(LoaderError::Unknown { path, error }) => {
                    bail!("Error while loading typegraphs from {path:?}: {error:?}");
                }
            }
        }

        if push_queue_init.is_empty() {
            bail!("No typegraph found!");
        }

        let node_config = config.node("deploy").with_args(&self.node);

        let node = node_config.clone().try_into()?;

        let push_loop = PushLoopBuilder::on(node)
            .exit(true)
            .start_with(push_queue_init.into_iter())?;
        push_loop.join().await?;

        Ok(())
    }
}
