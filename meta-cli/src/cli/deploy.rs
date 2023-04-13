// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;
use crate::typegraph::loader::queue::Queue;
use crate::typegraph::loader::watch::Watcher;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::{Discovery, LoaderResult};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::push::{PushConfig, PushResult, RetryId, RetryManager, RetryState};
use crate::utils::{ensure_venv, plural_suffix};
use anyhow::{bail, Context, Result};
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
            watch_mode.start().await?;
        } else {
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

            let mut err_count = 0;

            for path in paths.into_iter() {
                info!(
                    "Loading typegraphs from {rel_path:?}.",
                    rel_path = diff_paths(&path, &dir).unwrap()
                );
                let tgs = self
                    .load_typegraphs(&path, &dir, &loader, OnRewrite::Reload)
                    .await;

                for tg in tgs {
                    info!(
                        "Pushing typegraph {tg_name}...",
                        tg_name = tg.name().unwrap().cyan()
                    );
                    let tg_name = tg.name().unwrap().cyan();
                    match push_config.push(&tg).await {
                        Ok(res) => {
                            info!("{} Successfully pushed typegraph {tg_name}.", "✓".green());
                            self.handle_successful_push(res);
                        }
                        Err(e) => {
                            err_count += 1;
                            error!("Error while pushing typegraph {tg_name}: {}", e.to_string());
                        }
                    }
                }
            }
            if err_count > 0 {
                bail!(
                    "Failed to push {err_count} typegraph{s}",
                    s = plural_suffix(err_count)
                );
            }
        }

        Ok(())
    }
}

enum OnRewrite {
    Skip,
    Reload,
    Fail,
}

impl Deploy {
    #[async_recursion]
    async fn load_typegraphs(
        &self,
        path: &Path,
        base_dir: &Path,
        loader: &Loader,
        on_rewrite: OnRewrite,
    ) -> Vec<Typegraph> {
        let rel_path = diff_paths(path, base_dir).unwrap();
        match loader.load_file(path).await {
            LoaderResult::Loaded(tgs) => tgs,
            LoaderResult::Rewritten(_) => {
                info!("Typegraph definition at {rel_path:?} has been rewritten.");
                match on_rewrite {
                    OnRewrite::Skip => vec![],
                    OnRewrite::Reload => {
                        self.load_typegraphs(path, base_dir, loader, OnRewrite::Fail)
                            .await
                    }
                    OnRewrite::Fail => {
                        error!("Typegraph definition module at {rel_path:?} has been rewritten unexpectedly");
                        vec![]
                    }
                }
            }
            LoaderResult::Error(e) => {
                error!(
                    "Failed to load typegraph(s) from {rel_path:?}: {}",
                    e.to_string()
                );
                vec![]
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
    retry_tx: UnboundedSender<PushRetry>,
    retry_rx: UnboundedReceiver<PushRetry>,
    retry_manager: RetryManager,
    dependency_graph: DependencyGraph,
}

#[derive(Debug)]
pub struct PushRetry {
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
            dependency_graph: DependencyGraph::default(),
        })
    }

    async fn discovery(&mut self) -> Result<()> {
        let discovered = Discovery::new(Arc::clone(&self.config), self.base_dir.clone())
            .get_all()
            .await?;
        if discovered.is_empty() {
            warn!("No typegraph definition module found.");
        }

        for path in discovered.into_iter() {
            self.queue.push(path);
        }
        Ok(())
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

    async fn file_modified(&mut self, path: PathBuf) -> Result<()> {
        if &path == self.config.path.as_ref().unwrap() {
            warn!("Metatype config file has been modified.");
            warn!("Reloading everything...");
            // reload everything
            self.reset()?;
            self.discovery().await?;
            return Ok(());
        }

        let rdeps = self.dependency_graph.get_rdeps(&path);
        if !rdeps.is_empty() {
            for path in rdeps.into_iter() {
                self.queue.push(path);
            }
            return Ok(());
        }

        if !self.file_filter.is_excluded(&path) {
            let rel_path = diff_paths(&path, &self.base_dir).unwrap();
            info!("Reloading: file modified {:?}...", rel_path);
            self.retry_manager.cancell_all(&path);
            self.queue.push(path);
        }
        Ok(())
    }

    fn file_deleted(&mut self, path: PathBuf) {
        self.dependency_graph.remove_typegraph_at(&path);
    }

    async fn push_typegraph(&mut self, tg: Typegraph, retry_no: u32) {
        let tg_name = tg.name().unwrap().cyan();

        info!(
            "Pushing typegraph {tg_name}{}...",
            if retry_no > 0 {
                format!(" (retry {}/{})", retry_no, self.retry_max).dimmed()
            } else {
                String::default().dimmed()
            }
        );
        match self.push_config.push(&tg).await {
            Ok(res) => {
                self.deploy.handle_successful_push(res);
            }
            Err(e) => {
                error!("Error while pushing typegraph {tg_name}: {e:?}");
                if retry_no < self.retry_max {
                    warn!("Retrying in {} seconds...", self.retry_interval.as_secs());
                    let retry_id = self.retry_manager.add(tg.path.clone().unwrap());
                    let retry_tx = self.retry_tx.clone();
                    let retry_interval = self.retry_interval;
                    tokio::task::spawn(async move {
                        sleep(retry_interval).await;
                        retry_tx
                            .send(PushRetry {
                                id: retry_id,
                                tg,
                                retry_no: retry_no + 1,
                            })
                            .unwrap();
                    });
                }
            }
        }
    }

    async fn retry(&mut self, retry: PushRetry) -> Result<()> {
        let state = self
            .retry_manager
            .remove(retry.id, retry.tg.path.as_ref().unwrap())
            .with_context(|| {
                format!("Inconsistent state: retry #{} not found", retry.id.as_u32())
            })?;

        if let RetryState::Cancelled = state {
            trace!(
                "Retry #{} has been cancelled for typegraph {} at {:?}",
                retry.id.as_u32(),
                retry.tg.name().unwrap().cyan(),
                diff_paths(retry.tg.path.as_ref().unwrap(), &self.base_dir).unwrap()
            );
        } else {
            self.push_typegraph(retry.tg, retry.retry_no).await;
        }
        Ok(())
    }

    async fn start(&mut self) -> Result<()> {
        self.discovery().await?;

        // All the operations are sequential
        // Typegraph reload cancels any queued reload or pending push (retry)

        loop {
            select! {
                biased;

                Some(path) = self.watcher.next() => {
                    if path.try_exists()? {
                        self.file_modified(path).await?;
                    }
                    else {
                        self.file_deleted(path);
                    }
                }

                Some(retry) = self.retry_rx.recv() => {
                    self.retry(retry).await?;
                }

                Some(path) = self.queue.next() => {
                    let tgs = self
                        .deploy
                        .load_typegraphs(&path, &self.base_dir, &self.loader, OnRewrite::Skip)
                        .await;
                    for tg in tgs.into_iter() {
                        self.push_typegraph(tg, 0).await;
                    }
                }

            }
        }
    }
}
