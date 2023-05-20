// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use super::{Action, CommonArgs, GenArgs};
use crate::config::{tg_migrations_dir, Config};
use crate::typegraph::dependency_graph::DependencyGraph;
use crate::typegraph::loader::discovery::FileFilter;
use crate::typegraph::loader::queue::Queue;
use crate::typegraph::loader::watch::Watcher;
use crate::typegraph::loader::Loader;
use crate::typegraph::loader::{Discovery, LoaderResult};
use crate::typegraph::postprocess::prisma_rt::EmbedPrismaMigrations;
use crate::typegraph::postprocess::{self, EmbeddedPrismaMigrationOptionsPatch};
use crate::typegraph::push::{PushConfig, PushResult, RetryId, RetryManager, RetryState};
use crate::utils::{ensure_venv, plural_suffix};
use anyhow::{bail, Context, Result};
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::archive::unpack;
use common::typegraph::Typegraph;
use dialoguer::Confirm;
use log::{error, info, trace, warn};
use normpath::PathExt;
use pathdiff::diff_paths;
use tokio::select;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::time::sleep;

#[derive(Parser, Debug)]
pub struct DeploySubcommand {
    #[command(flatten)]
    node: CommonArgs,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<PathBuf>,

    #[command(flatten)]
    options: DeployOptions,
}

impl DeploySubcommand {
    pub fn new(node: CommonArgs, options: DeployOptions, file: Option<PathBuf>) -> Self {
        Self {
            node,
            options,
            file,
        }
    }
}

#[derive(Parser, Default, Debug, Clone)]
pub struct DeployOptions {
    /// Generate type/function definitions for external modules (Deno)
    #[clap(long, default_value_t = false)]
    pub codegen: bool,

    // TODO incompatible with create_migration, allow_dirty and allow_destructive
    /// Do not apply prisma migrations
    #[clap(long, default_value_t = false)]
    pub no_migration: bool,

    /// Create new migration if it would not be empty
    #[clap(long, default_value_t = false)]
    pub create_migration: bool,

    /// Allow deployment on dirty (git) repository
    #[clap(long, default_value_t = false)]
    pub allow_dirty: bool,

    /// Do no ask for confirmation before running destructive migrations
    #[clap(long, default_value_t = false)]
    pub allow_destructive: bool,

    /// Run in watch mode
    #[clap(long, default_value_t = false)]
    pub watch: bool,

    /// Typegate target (in metatype.yaml)
    #[clap(short, long)]
    pub target: String,
}

pub struct DefaultModeData;

pub struct WatchModeData {
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

impl WatchModeData {
    fn new(base_dir: &Path, config: &Config) -> Result<Self> {
        let config_path = config.path.as_ref().unwrap();
        let mut watcher = Watcher::new().context("Could not start watcher")?;
        watcher.watch(base_dir)?;
        watcher.watch(config_path)?;
        let (retry_tx, retry_rx) = unbounded_channel();
        let file_filter = FileFilter::new(config)?;
        Ok(Self {
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
}

pub struct Deploy<T = DefaultModeData> {
    config: Arc<Config>,
    base_dir: PathBuf,
    options: DeployOptions,
    loader: Loader,
    push_config: PushConfig,
    mode_data: T,
}

impl Deploy<DefaultModeData> {
    pub async fn new(deploy: &DeploySubcommand, args: &GenArgs) -> Result<Self> {
        let dir = args.dir()?;
        ensure_venv(&dir)?;
        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path, &dir)?);

        let options = deploy.options.clone();

        let mut loader = Loader::new(Arc::clone(&config))
            .skip_deno_modules(true)
            .with_postprocessor(postprocess::DenoModules::default().codegen(options.codegen));
        if !options.no_migration {
            loader = loader.with_postprocessor(
                EmbedPrismaMigrations::default()
                    .reset_on_drift(options.allow_destructive)
                    .create_migration(options.create_migration),
            );
        }

        let node_config = config.node(&options.target).with_args(&deploy.node);
        let node = node_config.build(&dir).await?;
        let push_config = PushConfig::new(node, config.base_dir.clone());

        Ok(Self {
            config,
            base_dir: dir,
            options,
            loader,
            push_config,
            mode_data: DefaultModeData,
        })
    }

    async fn run(self, file: Option<&PathBuf>) -> Result<()> {
        let paths = if let Some(path) = file {
            vec![path.normalize()?.into_path_buf()]
        } else {
            self.discovery().await?
        };

        if paths.is_empty() {
            bail!("No typegraph definition module found.");
        }

        let mut err_count = 0;

        trace!("Loading typegraphs...");
        for path in paths.into_iter() {
            info!(
                "Loading typegraphs from {rel_path:?}.",
                rel_path = diff_paths(&path, &self.base_dir).unwrap()
            );
            let tgs =
                Self::load_typegraphs(&path, &self.base_dir, &self.loader, OnRewrite::Reload).await;
            let tgs = match tgs {
                Err(e) => {
                    error!("{e:?}");
                    err_count += 1;
                    continue;
                }
                Ok(tgs) => tgs,
            };

            let mut tgs: VecDeque<_> = tgs.into_iter().collect();

            while let Some(tg) = tgs.pop_front() {
                let tg_name = tg.name().unwrap().cyan();
                info!("Pushing typegraph {tg_name}...");
                match self.push_config.push(&tg).await {
                    Ok(res) => {
                        if !res.success() {
                            error!("Some errors occured while pushing the typegraph {tg_name}");
                            err_count += 1;
                        }
                        match self.handle_push_result(res) {
                            HandlePushResult::Success => {}
                            HandlePushResult::Failure => {
                                error!("Error while pushing typegraph {tg_name}");
                            }
                            HandlePushResult::PushAgain { reset_database } => {
                                err_count -= 1;
                                let mut tg = tg;
                                if !reset_database.is_empty() {
                                    EmbeddedPrismaMigrationOptionsPatch::default()
                                        .reset_on_drift(true)
                                        .apply(&mut tg, reset_database)
                                        .unwrap();
                                }
                                // push again
                                tgs.push_front(tg);
                            }
                        }
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
        Ok(())
    }
}

enum HandlePushResult {
    Success,
    PushAgain { reset_database: Vec<String> },
    Failure,
}

impl<T> Deploy<T>
where
    T: Sync,
{
    fn watch_mode(self) -> Result<Deploy<WatchModeData>> {
        let mode_data = WatchModeData::new(&self.base_dir, &self.config)?;
        Ok(Deploy {
            config: Arc::clone(&self.config),
            base_dir: self.base_dir,
            options: self.options,
            loader: self.loader,
            push_config: self.push_config,
            mode_data,
        })
    }

    async fn discovery(&self) -> Result<Vec<PathBuf>> {
        Discovery::new(Arc::clone(&self.config), self.base_dir.clone())
            .get_all()
            .await
    }

    #[async_recursion]
    async fn load_typegraphs(
        path: &Path,
        base_dir: &Path,
        loader: &Loader,
        on_rewrite: OnRewrite,
    ) -> Result<Vec<Typegraph>> {
        let rel_path = diff_paths(path, base_dir).unwrap();
        match loader.load_file(path).await {
            LoaderResult::Loaded(tgs) => Ok(tgs),
            LoaderResult::Rewritten(_) => {
                info!("Typegraph definition at {rel_path:?} has been rewritten.");
                match on_rewrite {
                    OnRewrite::Skip => Ok(vec![]),
                    OnRewrite::Reload => {
                        Self::load_typegraphs(path, base_dir, loader, OnRewrite::Fail).await
                    }
                    OnRewrite::Fail => {
                        bail!("Typegraph definition module at {rel_path:?} has been rewritten unexpectedly");
                    }
                }
            }
            LoaderResult::Error(e) => {
                bail!(
                    "Failed to load typegraph(s) from {rel_path:?}: {}",
                    e.to_string()
                );
            }
        }
    }

    fn handle_push_result(&self, mut res: PushResult) -> HandlePushResult {
        let name = res.tg_name().to_string();
        res.print_messages();
        let prisma_config = &self.config.typegraphs.materializers.prisma;
        let migdir = tg_migrations_dir(
            &self.base_dir,
            prisma_config.migrations_path.as_deref(),
            &name,
        );
        for migrations in res.take_migrations() {
            let dest = migdir.join(&migrations.runtime);
            if let Err(e) = unpack(&dest, Some(migrations.migrations)) {
                error!(
                    "Error while unpacking migrations into {:?}",
                    diff_paths(dest, &self.base_dir)
                );
                error!("{e:?}");
            } else {
                info!(
                    "Successfully unpacked migrations for {name}/{}!",
                    migrations.runtime
                );
            }
        }

        let resets = res.reset_required();
        if !resets.is_empty()
            && Confirm::new()
                .with_prompt(format!(
                    "{} Do you want to reset the database{s} for {runtimes} on {name}?",
                    "[confirm]".yellow(),
                    s = plural_suffix(resets.len()),
                    runtimes = resets.join(", ").magenta(),
                    name = name.cyan(),
                ))
                .interact()
                .unwrap()
        {
            return HandlePushResult::PushAgain {
                reset_database: resets.to_vec(),
            };
        }
        if res.success() {
            info!("{} Successfully pushed typegraph {name}.", "✓".green());
            HandlePushResult::Success
        } else {
            HandlePushResult::Failure
        }
    }
}

struct WatchModeRestart(bool);

#[async_trait]
impl Action for DeploySubcommand {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let deploy = Deploy::new(self, &args).await?;

        if !self.options.allow_dirty {
            let repo = git2::Repository::discover(&deploy.config.base_dir).ok();

            if let Some(repo) = repo {
                let dirty = repo.statuses(None)?.iter().any(|s| {
                    // git2::Status::CURRENT.bits() == 0
                    // https://github.com/libgit2/libgit2/blob/2f20fe8869d7a1df7c9b7a9e2939c1a20533c6dc/include/git2/status.h#L35
                    !s.status().is_empty() && !s.status().contains(git2::Status::IGNORED)
                });
                if dirty {
                    bail!("Dirty repository not allowed");
                }
            } else {
                warn!("Not in a git repository.");
            }
        }

        if deploy.options.watch {
            let mut deploy = deploy;
            loop {
                let restart = deploy.watch_mode()?.run(self.file.as_ref()).await?;
                if !restart.0 {
                    break;
                }
                deploy = Deploy::new(self, &args).await?;
            }
        } else {
            deploy.run(self.file.as_ref()).await?;
        }
        Ok(())
    }
}

enum OnRewrite {
    Skip,
    Reload,
    Fail,
}

#[derive(Debug)]
pub struct PushRetry {
    pub id: RetryId,
    pub tg: Typegraph,
    pub retry_no: u32,
}

impl Deploy<WatchModeData> {
    async fn reload_all_from_discovery(&mut self) -> Result<()> {
        let discovered = self.discovery().await?;
        if discovered.is_empty() {
            warn!("No typegraph definition module found.");
        }

        for path in discovered.into_iter() {
            self.mode_data.queue.push(path);
        }
        Ok(())
    }

    async fn file_modified(&mut self, path: PathBuf) -> Result<WatchModeRestart> {
        if &path == self.config.path.as_ref().unwrap() {
            warn!("Metatype config file has been modified.");
            warn!("Reloading everything...");
            // reload everything
            return Ok(WatchModeRestart(true));
        }

        let w = &mut self.mode_data;

        let rdeps = w.dependency_graph.get_rdeps(&path);
        if !rdeps.is_empty() {
            let rel_path = diff_paths(&path, &self.base_dir).unwrap();
            info!("File modified: {rel_path:?}");
            for path in rdeps.into_iter() {
                let rel_path = diff_paths(&path, &self.base_dir).unwrap();
                info!("- Reloading dependency: {rel_path:?}");
                w.queue.push(path);
            }
            return Ok(WatchModeRestart(false));
        }

        if !w.file_filter.is_excluded(&path) {
            let rel_path = diff_paths(&path, &self.base_dir).unwrap();
            info!("Reloading: file modified {:?}...", rel_path);
            w.retry_manager.cancell_all(&path);
            w.queue.push(path);
        }
        Ok(WatchModeRestart(false))
    }

    fn file_deleted(&mut self, path: PathBuf) {
        self.mode_data.dependency_graph.remove_typegraph_at(&path);
    }

    #[async_recursion]
    async fn push_typegraph(&mut self, tg: Typegraph, retry_no: u32) {
        let tg_name = tg.name().unwrap().cyan();

        info!(
            "Pushing typegraph {tg_name}{}...",
            if retry_no > 0 {
                format!(" (retry {}/{})", retry_no, self.mode_data.retry_max).dimmed()
            } else {
                String::default().dimmed()
            }
        );
        match self.push_config.push(&tg).await {
            Ok(res) => match self.handle_push_result(res) {
                HandlePushResult::Success => {}
                // HandlePushResult::Failure => self.schedule_retry(tg, retry_no + 1),
                HandlePushResult::Failure => {}
                HandlePushResult::PushAgain { reset_database } => {
                    let mut tg = tg;
                    if !reset_database.is_empty() {
                        EmbeddedPrismaMigrationOptionsPatch::default()
                            .reset_on_drift(true)
                            .apply(&mut tg, reset_database)
                            .unwrap();
                    }
                    info!("Repushing typegraph {tg_name} with new flags.");
                    self.push_typegraph(tg, 0).await;
                }
            },
            Err(e) => {
                error!("Error while pushing typegraph {tg_name}: {e:?}");
                self.schedule_retry(tg, retry_no + 1);
            }
        }
    }

    fn schedule_retry(&mut self, tg: Typegraph, retry_no: u32) {
        if retry_no <= self.mode_data.retry_max {
            warn!(
                "Retrying in {} seconds...",
                self.mode_data.retry_interval.as_secs()
            );
            let retry_id = self.mode_data.retry_manager.add(tg.path.clone().unwrap());
            let retry_tx = self.mode_data.retry_tx.clone();
            let retry_interval = self.mode_data.retry_interval;
            tokio::task::spawn(async move {
                sleep(retry_interval).await;
                retry_tx
                    .send(PushRetry {
                        id: retry_id,
                        tg,
                        retry_no,
                    })
                    .unwrap();
            });
        }
    }

    async fn retry(&mut self, retry: PushRetry) -> Result<()> {
        let state = self
            .mode_data
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

    async fn run(mut self, file: Option<&PathBuf>) -> Result<WatchModeRestart> {
        if let Some(file) = &file {
            error!("Cannot enter watch mode with a single file {:?}:", file);
            error!("Please re-run without the --file option.");
            bail!("Cannot enter watch mode with a single file.");
        }

        info!("Entering watch mode...");

        self.reload_all_from_discovery().await?;

        // All the operations are sequential
        // Typegraph reload cancels any queued reload or pending push (retry)

        loop {
            select! {
                biased;

                Some(path) = self.mode_data.watcher.next() => {
                    if path.try_exists()? {
                        let restart = self.file_modified(path).await?;
                        if restart.0 {
                            return Ok(restart);
                        }
                    }
                    else {
                        self.file_deleted(path);
                    }
                }

                Some(retry) = self.mode_data.retry_rx.recv() => {
                    self.retry(retry).await?;
                }

                Some(path) = self.mode_data.queue.next() => {
                    let tgs = Self::load_typegraphs(&path, &self.base_dir, &self.loader, OnRewrite::Skip).await;
                    match tgs {
                        Err(e) => error!("{e:?}"),
                        Ok(tgs) => {
                            for tg in tgs.into_iter() {
                                self.mode_data.dependency_graph.update_typegraph(&tg);
                                self.push_typegraph(tg, 0).await;
                            }
                        }
                    }
                }

            }
        }
    }
}
