// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::loader::discovery::FileFilter;
use crate::typegraph::loader::queue::Queue;
use crate::typegraph::loader::watch::Watcher;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::{Discovery, LoaderResult};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::{PushConfig, PushResult, RetryId, RetryManager, RetryState};
use crate::utils::{ensure_venv, plural_suffix};
use anyhow::{anyhow, bail, Context, Result};
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::typegraph::Typegraph;
use log::{error, info, trace, warn};
use pathdiff::diff_paths;
use tokio::select;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::time::sleep;

#[derive(Parser, Debug)]
pub struct Deploy {
    #[command(flatten)]
    node: CommonArgs,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<PathBuf>,

    #[command(flatten)]
    options: DeployOptions,
}

#[derive(Parser, Default, Debug)]
pub struct DeployOptions {
    /// Generate type/function definitions for external modules (Deno)
    #[clap(long, default_value_t = false)]
    pub codegen: bool,

    // TODO incompatible with allow_dirty and allow_destructive
    /// Do not run prisma migrations
    #[clap(long, default_value_t = false)]
    pub no_migration: bool,

    /// Allow deployment on dirty (git) repository
    #[clap(long, default_value_t = false)]
    pub allow_dirty: bool,

    /// Do no ask for confirmation before running destructive migrations
    #[clap(long, default_value_t = false)]
    pub allow_destructive: bool,

    /// Run in watch mode
    #[clap(long, default_value_t = false)]
    pub watch: bool,

    /// Target typegate profile (in metatype.yaml)
    #[clap(long, default_value_t = String::from("deploy"))]
    pub target: String,
}

impl Deploy {
    pub fn new(node: CommonArgs, options: DeployOptions, file: Option<PathBuf>) -> Self {
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
        let dir = args.dir()?;
        let config_path = args.config;
        ensure_venv(&dir)?;
        let config = Config::load_or_find(config_path, &dir)?;
        let config = Arc::new(config);

        let mut loader = Loader::new(Arc::clone(&config));
        if !self.options.no_migration {
            loader = loader.with_postprocessor(
                EmbedPrismaMigrations::default()
                    .allow_dirty(self.options.allow_dirty)
                    .reset_on_drift(self.options.allow_destructive),
            );
        }
        let loader = loader;

        let node_config = config.node(&self.options.target).with_args(&self.node);
        let node = node_config.clone().build()?;
        let push_config = PushConfig::new(node, config.base_dir.clone());

        if self.options.watch {
            if let Some(file) = &self.file {
                error!("Cannot enter watch mode with a single file {:?}:", file);
                error!("Please re-run without the --file option.");
                bail!("Cannot enter watch mode with a single file.");
            }

            let mut watch_mode = WatchMode::new(self, config, dir, loader, push_config)?;

            info!("Entering watch mode...");

            // reload everything each time WatchMode::start returns successfully
            loop {
                watch_mode.start().await?;
                watch_mode.reset()?;
            }
        }

        let paths = if let Some(path) = &self.file {
            vec![path.canonicalize()?]
        } else {
            Discovery::new(Arc::clone(&config), dir.clone())
                .get_all()
                .await?
        };

        if paths.is_empty() {
            bail!("No typegraph definition module found.");
        }

        for path in paths.into_iter() {
            self.load_and_push(&path, &dir, &loader, &push_config, OnRewrite::Reload)
                .await
                .map_err(|e| match e {
                    LoadAndPushError::LoaderError => {
                        anyhow!("Error while loading the typegraph")
                    }
                    LoadAndPushError::PushError(tgs) => anyhow!(
                        "Error when pushing typegraph{s}: {tg_names}",
                        s = plural_suffix(tgs.len()),
                        tg_names = tgs
                            .into_iter()
                            .map(|tg| tg.name().unwrap())
                            .collect::<Vec<_>>()
                            .join(", ")
                    ),
                })?;
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
        base_dir: &Path,
        loader: &Loader,
        push_config: &PushConfig,
        on_rewrite: OnRewrite,
    ) -> Result<(), LoadAndPushError> {
        match loader.load_file(path).await {
            LoaderResult::Loaded(tgs) => {
                let mut failed = vec![];

                for tg in tgs.into_iter() {
                    let name = tg.name().unwrap().cyan();
                    info!("Pushing typegraph {name}...",);
                    match push_config.push(&tg).await {
                        Ok(res) => self.handle_successful_push(res),
                        Err(e) => {
                            error!(
                                "Error while pushing typegraph {name}: {e:?}",
                                name = tg.name().unwrap().cyan()
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
            LoaderResult::Rewritten(_) => {
                let rel_path = diff_paths(path, base_dir).unwrap();
                info!("Typegraph definition at {rel_path:?} has been rewritten.");
                match on_rewrite {
                    OnRewrite::Skip => Ok(()),
                    OnRewrite::Reload => {
                        self.load_and_push(path, base_dir, loader, push_config, on_rewrite)
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

    fn handle_successful_push(&self, res: PushResult) {
        let name = res.tg_name().cyan();
        info!("{} Successfully pushed typegraph {name}", "✓".green());
        res.print_messages();
        // TODO unpack migrations
    }
}

struct WatchMode<'a> {
    deploy: &'a Deploy,
    config: Arc<Config>,
    base_dir: PathBuf,
    loader: Loader,
    push_config: PushConfig,
    retry_max: u32,
    retry_interval: Duration,
    file_filter: FileFilter,
    queue: Queue,
    watcher: Watcher,
    retry_tx: UnboundedSender<Retry>,
    retry_rx: UnboundedReceiver<Retry>,
    retry_manager: RetryManager,
}

#[derive(Debug)]
pub struct Retry {
    pub id: RetryId,
    pub tg: Typegraph,
    pub retry_no: u32,
}

impl<'a> WatchMode<'a> {
    fn new(
        deploy: &'a Deploy,
        config: Arc<Config>,
        base_dir: PathBuf,
        loader: Loader,
        push_config: PushConfig,
    ) -> Result<Self> {
        let config_path = config.path.as_ref().unwrap();
        let mut watcher = Watcher::new().context("Could not start watcher")?;
        watcher.watch(&base_dir)?;
        watcher.watch(config_path)?;
        let (retry_tx, retry_rx) = unbounded_channel();
        let file_filter = FileFilter::new(&config)?;
        Ok(Self {
            deploy,
            config,
            base_dir,
            loader,
            push_config,
            retry_max: 3,                           // TODO configurable
            retry_interval: Duration::from_secs(5), // TODO configurable
            file_filter,
            queue: Queue::default(),
            watcher,
            retry_tx,
            retry_rx,
            retry_manager: RetryManager::default(),
        })
    }

    fn reset(&mut self) -> Result<()> {
        self.queue = Queue::default();
        self.watcher = Watcher::new().context("Could not restart watcher")?;
        self.watcher.watch(&self.base_dir)?;
        self.watcher.watch(&self.config.path.as_ref().unwrap())?;
        let (retry_tx, retry_rx) = unbounded_channel();
        self.retry_tx = retry_tx;
        self.retry_rx = retry_rx;

        Ok(())
    }

    async fn start(&mut self) -> Result<()> {
        let discovered = Discovery::new(Arc::clone(&self.config), self.base_dir.clone())
            .get_all()
            .await?;
        if discovered.is_empty() {
            warn!("No typegraph definition module found.");
        }

        for path in discovered.into_iter() {
            self.queue.push(path);
        }

        let config_path = self.config.path.as_ref().unwrap();

        // All the operations are sequential
        // Typegraph reload cancels any queued reload or pending push (retry)

        loop {
            select! {
                biased;

                Some(path) = self.watcher.next() => {
                    if &path == config_path {
                        warn!("Metatype config file has been modified.");
                        warn!("Reloading everything...");
                        // reload everything
                        return Ok(());
                    }
                    if !self.file_filter.is_excluded(&path) {
                        let rel_path = diff_paths(&path, &self.base_dir).unwrap();
                        info!("Reloading: file modified {:?}...", rel_path);
                        self.retry_manager.cancell_all(&path);
                        self.queue.push(path);
                    }
                }

                Some(Retry { tg, retry_no, id }) = self.retry_rx.recv() => {
                    let state = self.retry_manager
                        .remove(id, tg.path.as_ref().unwrap())
                        .context("Inconsistent state: retry not found".to_string())?;

                    if let RetryState::Cancelled = state {
                        let rel_path = diff_paths(tg.path.as_ref().unwrap(), &self.base_dir).unwrap();
                        trace!(
                            "Retry #{} has been cancelled for typegraph {} at {:?}",
                            id.as_u32(),
                            tg.name().unwrap().cyan(),
                            rel_path
                        );
                    } else {
                        let retry = format!("(retry {retry_no}/{})", self.retry_max).dimmed();
                        info!("Pushing typegraph {name} {retry}...", name = tg.name().unwrap().cyan());
                        match self.push_config.push(&tg).await {
                            Ok(res) => {
                                self.deploy.handle_successful_push(res);
                            }
                            Err(e) => {
                                error!("Error while pushing typegraph {name}: {e:?}", name = tg.name().unwrap().cyan());
                                if retry_no < self.retry_max {
                                    warn!("Retrying in {} seconds...", self.retry_interval.as_secs());
                                    let retry_id = self.retry_manager.add(tg.path.clone().unwrap());
                                    let retry_tx = self.retry_tx.clone();
                                    let retry_interval = self.retry_interval;
                                    tokio::task::spawn(async move {
                                        sleep(retry_interval).await;
                                        retry_tx.send(Retry { id: retry_id, tg, retry_no: retry_no + 1  }).unwrap();
                                    });
                                }
                            }
                        }
                    }
                }

                Some(path) = self.queue.next() => {
                    match self.deploy.load_and_push(&path, &self.base_dir, &self.loader, &self.push_config, OnRewrite::Skip).await {
                        Ok(()) => {},
                        Err(LoadAndPushError::LoaderError) => { },
                        Err(LoadAndPushError::PushError(failed)) => {
                            for tg in failed.into_iter() {
                                warn!(
                                    "Retrying to push {name} in {interval} seconds...",
                                    name = tg.name().unwrap().cyan(),
                                    interval = self.retry_interval.as_secs()
                                );
                                let retry_id = self.retry_manager.add(tg.path.clone().unwrap());
                                let retry_tx = self.retry_tx.clone();
                                let retry_interval = self.retry_interval;
                                tokio::task::spawn(async move {
                                    sleep(retry_interval).await;
                                    retry_tx.send(Retry { id: retry_id, tg, retry_no: 1  }).unwrap();
                                });
                            }
                        }
                    }
                }

            }
        }
    }
}
