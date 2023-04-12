// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::loader::queue::Queue;
use crate::typegraph::loader::{Discovery, LoaderResult};
use crate::typegraph::loader::{Loader, LoaderError};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::{DelayedPushQueue, PushConfig};
use crate::utils::{ensure_venv, Node};
use anyhow::Result;
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::typegraph::Typegraph;
use log::{debug, error, info, trace, warn};
use tokio::select;

#[derive(Parser, Debug)]
pub struct Deploy {
    #[command(flatten)]
    node: CommonArgs,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<String>,

    #[command(flatten)]
    options: DeployOptions,
}

#[derive(Parser, Default, Debug)]
pub struct DeployOptions {
    /// Generate type/function definitions for external modules (Deno)
    #[clap(long, default_value_t = false)]
    pub codegen: bool,

    /// Do not run prisma migrations
    #[clap(long, default_value_t = false)]
    pub no_migration: bool,

    /// Allow deployment on dirty (git) repository
    #[clap(long, default_value_t = false)]
    pub allow_dirty: bool,

    // TODO: on_destructive_migrations -> enum { Prompt, Run, Skip }
    /// Do no prompt on before running migrations
    #[clap(long, default_value_t = false)]
    pub run_destructive_migrations: bool,

    /// Run in watch mode
    #[clap(long, default_value_t = false)]
    pub watch: bool,

    /// Target typegate profile (in metatype.yaml)
    #[clap(long, default_value_t = String::from("dev"))]
    pub target: String,
}

impl Deploy {
    pub fn new(node: CommonArgs, options: DeployOptions, file: Option<String>) -> Self {
        Self {
            node,
            file,
            options,
        }
    }
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = Path::new(&args.dir).canonicalize()?;
        let config_path = args.config;
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;
        let config = Arc::new(config);

        let mut loader = Loader::new(Arc::clone(&config));
        if !self.options.no_migration {
            loader = loader.with_postprocessor(
                EmbedPrismaMigrations::default()
                    .allow_dirty(self.options.allow_dirty)
                    .reset_on_drift(self.options.run_destructive_migrations),
            );
        }

        let loader = loader;

        // only if self.file is None
        let discovered = Discovery::new(Arc::clone(&config), dir.clone())
            .get_all()
            .await?;

        if discovered.is_empty() {
            warn!("No typegraph definition module found.");
        }

        let node_config = config.node(&self.options.target).with_args(&self.node);

        let node = node_config.clone().build()?;
        let push_config = PushConfig::new(node, config.base_dir.clone());

        if self.options.watch {
            info!("Entering watch mode...");
            self.enter_watch_mode(discovered, loader, push_config).await;
        } else {
            for path in discovered.into_iter() {
                let _ = self
                    .load_and_push(&path, &loader, &push_config, OnRewrite::Reload)
                    .await;
            }
        }

        Ok(())
    }
}

enum LoadAndPushError {
    LoaderError,
    PushError(Vec<Typegraph>),
}

enum OnRewrite {
    Skip,
    Reload,
}

impl Deploy {
    #[async_recursion]
    async fn load_and_push(
        &self,
        path: &Path,
        loader: &Loader,
        push_config: &PushConfig,
        on_rewrite: OnRewrite,
    ) -> Result<(), LoadAndPushError> {
        match loader.load_file(&path).await {
            LoaderResult::Loaded(tgs) => {
                let mut failed = vec![];

                for tg in tgs.into_iter() {
                    let name = tg.name().unwrap().blue();
                    info!("Pushing typegraph {name}...",);
                    match push_config.push(&tg).await {
                        Ok(res) => {
                            info!("{} Successfully pushed typegraph {name}", "✓".green());
                            res.print_messages();
                            // TODO unpack migrations
                        }
                        Err(e) => {
                            error!(
                                "Error while pushing typegraph {name}: {e:?}",
                                name = tg.name().unwrap().blue()
                            );
                            failed.push(tg);
                        }
                    }
                }
                if failed.is_empty() {
                    Ok(())
                } else {
                    Err(LoadAndPushError::PushError(failed))
                }
            }
            LoaderResult::Rewritten(p) => {
                info!("Typegraph definition at {path:?} has been rewritten.");
                match on_rewrite {
                    OnRewrite::Skip => Ok(()),
                    OnRewrite::Reload => {
                        self.load_and_push(path, loader, push_config, on_rewrite)
                            .await
                    }
                }
            }
            LoaderResult::Error(e) => {
                error!("{}", e.to_string());
                Err(LoadAndPushError::LoaderError)
            }
        }
    }

    async fn enter_watch_mode(
        &self,
        discovered: Vec<PathBuf>,
        loader: Loader,
        push_config: PushConfig,
    ) {
        assert!(self.file.is_none());
        let queue = Queue::new();
        for path in discovered.into_iter() {
            queue.push(path).await;
        }
        // TODO init watcher
        //

        let mut retries = DelayedPushQueue::new();
        let retry_max = 3;
        let retry_interval = Duration::from_secs(5);

        loop {
            select! {
                biased;
                Some((path, guard)) = queue.next() => {
                    match self.load_and_push(&path, &loader, &push_config, OnRewrite::Skip).await {
                        Ok(_) => {},
                        Err(LoadAndPushError::LoaderError) => { },
                        Err(LoadAndPushError::PushError(failed)) => {
                            for tg in failed.into_iter() {
                                warn!("Retrying to push {name} in {interval} seconds...", name = tg.name().unwrap().blue(), interval = retry_interval.as_secs());
                                retries.delayed_push(tg, 1, retry_interval).await;
                            }
                        }
                    }
                    guard.unblock().await;
                }
                _ = queue.wait() => {
                    continue;
                }
                Some((tg, retry_no)) = retries.next() => {
                    info!("Pushing typegraph {name} (retry {retry_no}/{retry_max})...", name = tg.name().unwrap().blue());
                    let guard = queue.block(tg.path.as_ref().unwrap()).await;
                    match push_config.push(&tg).await {
                        Ok(res) => {
                            res.print_messages();
                            // TODO unpack migrations
                        }
                        Err(e) => {
                            error!("Error while pushing typegraph {name}: {e:?}", name = tg.name().unwrap().blue());
                            if retry_no < retry_max {
                                warn!("Retrying in {} seconds...",  retry_interval.as_secs());
                                retries.delayed_push(tg, retry_no + 1, retry_interval).await;
                            }
                        }
                    }
                    guard.unblock().await;
                }
                // watch config file
            }
        }
    }
}
