// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::Arc;

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::deploy::actors;
use crate::deploy::actors::console::{warning, ConsoleActor};
use crate::deploy::actors::discovery::DiscoveryActor;
use crate::deploy::actors::loader::{
    self, LoaderActor, PostProcessOptions, ReloadModule, ReloadReason, StopBehavior,
};
use crate::deploy::actors::pusher::{CancelPush, Push, PusherActor, Stop as PusherStop};
use crate::deploy::actors::watcher::WatcherActor;
use crate::utils::{ensure_venv, Node};
use actix::prelude::*;
use anyhow::{bail, Result};
use async_trait::async_trait;
use clap::Parser;
use log::warn;
use tokio::sync::mpsc;

#[derive(Parser, Debug)]
pub struct DeploySubcommand {
    #[command(flatten)]
    node: CommonArgs,

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: String,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<PathBuf>,

    #[command(flatten)]
    options: DeployOptions,
}

impl DeploySubcommand {
    pub fn new(
        node: CommonArgs,
        target: String,
        options: DeployOptions,
        file: Option<PathBuf>,
    ) -> Self {
        Self {
            node,
            target,
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
}

pub struct Deploy {
    config: Arc<Config>,
    base_dir: Arc<Path>,
    options: DeployOptions,
    node: Node,
}

impl Deploy {
    pub async fn new(deploy: &DeploySubcommand, args: &GenArgs) -> Result<Self> {
        let dir = args.dir()?;
        ensure_venv(&dir)?;
        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path, &dir)?);

        let options = deploy.options.clone();

        // let mut loader = Loader::new(Arc::clone(&config))
        //     .skip_deno_modules(true)
        //     .with_postprocessor(postprocess::DenoModules::default().codegen(options.codegen))
        //     .with_postprocessor(postprocess::PythonModules::default())
        //     .with_postprocessor(postprocess::WasmdegeModules::default());

        if !options.no_migration {
            // loader = loader.with_postprocessor(
            //     EmbedPrismaMigrations::default()
            //         .reset_on_drift(options.allow_destructive)
            //         .create_migration(options.create_migration),
            // );
        }

        let node_config = config.node(&deploy.node, &deploy.target);
        let node = node_config.build(&dir).await?;

        Ok(Self {
            config,
            base_dir: dir.into(),
            options,
            node,
        })
    }

    // async fn run(self, file: Option<&PathBuf>) -> Result<()> {
    //     let paths = if let Some(path) = file {
    //         vec![path.normalize()?.into_path_buf()]
    //     } else {
    //         self.discovery().await?
    //     };
    //
    //     if paths.is_empty() {
    //         bail!("No typegraph definition module found.");
    //     }
    //
    //     let mut err_count = 0;
    //
    //     trace!("Loading typegraphs...");
    //     for path in paths.into_iter() {
    //         let rel_path = diff_paths(&path, &self.base_dir).unwrap();
    //         info!("Loading typegraphs from {}.", rel_path.display());
    //         let tgs = Self::load_typegraphs(
    //             &path,
    //             &self.base_dir,
    //             &self.loader,
    //             // OnRewrite::Reload
    //         )
    //         .await;
    //         let tgs = match tgs {
    //             Err(e) => {
    //                 error!("{e:?}");
    //                 err_count += 1;
    //                 continue;
    //             }
    //             Ok(tgs) => tgs,
    //         };
    //
    //         let mut tgs: VecDeque<_> = tgs.into_iter().collect();
    //
    //         if tgs.is_empty() {
    //             warn!("No typegraph found in {}.", rel_path.display());
    //             continue;
    //         }
    //
    //         while let Some(tg) = tgs.pop_front() {
    //             let tg_name = tg.full_name().unwrap().cyan();
    //             info!("Pushing typegraph {tg_name}...");
    //             match self.push_config.push(&tg).await {
    //                 Ok(res) => {
    //                     if !res.success() {
    //                         error!("Some errors occured while pushing the typegraph {tg_name}");
    //                         err_count += 1;
    //                     }
    //                     match self.handle_push_result(res) {
    //                         HandlePushResult::Success => {}
    //                         HandlePushResult::Failure => {
    //                             error!("Error while pushing typegraph {tg_name}");
    //                         }
    //                         HandlePushResult::PushAgain { reset_database } => {
    //                             err_count -= 1;
    //                             let mut tg = tg;
    //                             if !reset_database.is_empty() {
    //                                 EmbeddedPrismaMigrationOptionsPatch::default()
    //                                     .reset_on_drift(true)
    //                                     .apply(&mut tg, reset_database)
    //                                     .unwrap();
    //                             }
    //                             // push again
    //                             tgs.push_front(tg);
    //                         }
    //                     }
    //                 }
    //                 Err(e) => {
    //                     err_count += 1;
    //                     error!("Error while pushing typegraph {tg_name}: {}", e.to_string());
    //                 }
    //             }
    //         }
    //     }
    //
    //     if err_count > 0 {
    //         bail!(
    //             "Failed to push {err_count} typegraph{s}",
    //             s = plural_suffix(err_count)
    //         );
    //     }
    //     Ok(())
    // }
}

// enum HandlePushResult {
//     Success,
//     PushAgain { reset_database: Vec<String> },
//     Failure,
// }

// impl<T> Deploy<T>
// where
//     T: Sync,
// {
//     fn watch_mode(self) -> Result<Deploy<WatchModeData>> {
//         let mode_data = WatchModeData::new(&self.base_dir, &self.config)?;
//         Ok(Deploy {
//             config: Arc::clone(&self.config),
//             base_dir: self.base_dir,
//             options: self.options,
//             loader: self.loader,
//             push_config: self.push_config,
//             mode_data,
//         })
//     }
//
//     async fn discovery(&self) -> Result<Vec<PathBuf>> {
//         Discovery::new(Arc::clone(&self.config), self.base_dir.clone())
//             .get_all(false)
//             .await
//     }
//
//     // #[async_recursion]
//     async fn load_typegraphs(
//         path: &Path,
//         base_dir: &Path,
//         loader: &Loader,
//         // on_rewrite: OnRewrite,
//     ) -> Result<Vec<Typegraph>> {
//         let rel_path = diff_paths(path, base_dir).unwrap();
//         loader
//             .load_module(path)
//             .await
//             .map_err(|e| anyhow!("Failed to load typegraph(s) from {rel_path:?}: {e:?}",))
//         // match loader.load_file(path).await {
//         //     LoaderResult::Loaded(tgs) => Ok(tgs),
//         //     LoaderResult::Rewritten(_) => {
//         //         info!("Typegraph definition at {rel_path:?} has been rewritten.");
//         //         match on_rewrite {
//         //             OnRewrite::Skip => Ok(vec![]),
//         //             OnRewrite::Reload => {
//         //                 Self::load_typegraphs(path, base_dir, loader, OnRewrite::Fail).await
//         //             }
//         //             OnRewrite::Fail => {
//         //                 bail!("Typegraph definition module at {rel_path:?} has been rewritten unexpectedly");
//         //             }
//         //         }
//         //     }
//         //     LoaderResult::Error(e) => {
//         //         bail!(
//         //             "Failed to load typegraph(s) from {rel_path:?}: {}",
//         //             e.to_string()
//         //         );
//         //     }
//         // }
//     }
//
//     fn handle_push_result(&self, mut res: PushResult) -> HandlePushResult {
//         let name = res.tg_name().to_string();
//         res.print_messages();
//         let migdir = self
//             .config
//             .prisma_migrations_dir(res.original_name.as_ref().unwrap());
//         for migrations in res.take_migrations() {
//             let dest = migdir.join(&migrations.runtime);
//             if let Err(e) = unpack(&dest, Some(migrations.migrations)) {
//                 error!(
//                     "Error while unpacking migrations into {:?}",
//                     diff_paths(dest, &self.base_dir)
//                 );
//                 error!("{e:?}");
//             } else {
//                 info!(
//                     "Successfully unpacked migrations for {name}/{} at {:?}!",
//                     migrations.runtime, dest
//                 );
//             }
//         }
//
//         let resets = res.reset_required();
//         if !resets.is_empty()
//             && Confirm::new()
//                 .with_prompt(format!(
//                     "{} Do you want to reset the database{s} for {runtimes} on {name}?",
//                     "[confirm]".yellow(),
//                     s = plural_suffix(resets.len()),
//                     runtimes = resets.join(", ").magenta(),
//                     name = name.cyan(),
//                 ))
//                 .interact()
//                 .unwrap()
//         {
//             return HandlePushResult::PushAgain {
//                 reset_database: resets.to_vec(),
//             };
//         }
//         if res.success() {
//             info!("{} Successfully pushed typegraph {name}.", "✓".green());
//             HandlePushResult::Success
//         } else {
//             HandlePushResult::Failure
//         }
//     }
// }

// struct WatchModeRestart(bool);

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
            let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

            loop {
                let secrets =
                    lade_sdk::hydrate(deploy.node.env.clone(), deploy.base_dir.to_path_buf())
                        .await?;

                let (typegraph_tx, typegraph_rx) = mpsc::unbounded_channel();

                let loader = LoaderActor::new(
                    Arc::clone(&deploy.config),
                    PostProcessOptions {
                        deno_codegen: deploy.options.codegen,
                        prisma_run_migrations: !deploy.options.no_migration,
                        prisma_create_migration: deploy.options.create_migration,
                        allow_destructive: deploy.options.allow_destructive,
                    },
                    console.clone(),
                    typegraph_tx,
                )
                .start();

                let pusher = PusherActor::new(
                    Arc::clone(&deploy.config),
                    console.clone(),
                    deploy.base_dir.clone(),
                    deploy.node.clone(),
                    secrets,
                )
                .start();

                let _discovery = DiscoveryActor::new(
                    Arc::clone(&deploy.config),
                    loader.clone(),
                    console.clone(),
                    Arc::clone(&deploy.base_dir),
                )
                .start();

                let (watch_event_tx, watch_event_rx) = mpsc::unbounded_channel();

                let watcher = WatcherActor::new(
                    Arc::clone(&deploy.config),
                    deploy.base_dir.clone(),
                    watch_event_tx,
                    console.clone(),
                )?
                .start();

                let pusher_clone = pusher.clone();
                Arbiter::current().spawn(async move {
                    let pusher = pusher_clone;
                    let mut typegraph_rx = typegraph_rx;
                    while let Some(tg) = typegraph_rx.recv().await {
                        // TODO await -- no queue
                        pusher.do_send(Push::new(tg.into()));
                    }
                    log::trace!("Typegraph channel closed.");
                    // pusher address will be dropped when both loops are done
                });

                let loader_clone = loader.clone();
                let console_clone = console.clone();
                let watcher_clone = watcher.clone();
                Arbiter::current().spawn(async move {
                    let loader = loader_clone;
                    let console = console_clone;
                    let watcher = watcher_clone;
                    let mut watch_event_rx = watch_event_rx;
                    while let Some(event) = watch_event_rx.recv().await {
                        use actors::watcher::Event as E;
                        match event {
                            E::ConfigChanged => {
                                warning!(console, "Metatype configuration file changed.");
                                warning!(console, "Reloading everything.");
                                loader.do_send(loader::TryStop(StopBehavior::Restart));
                                watcher.do_send(actors::watcher::Stop);
                            }
                            E::TypegraphModuleChanged { typegraph_module } => {
                                loader.do_send(ReloadModule(
                                    typegraph_module.clone(),
                                    ReloadReason::FileChanged,
                                ));
                                pusher.do_send(CancelPush(typegraph_module))
                            }
                            E::TypegraphModuleDeleted { typegraph_module } => {
                                pusher.do_send(CancelPush(typegraph_module));
                                todo!("delete module")
                            }
                            E::DependencyChanged {
                                typegraph_module,
                                dependency_path,
                            } => {
                                loader.do_send(ReloadModule(
                                    typegraph_module.clone(),
                                    ReloadReason::DependencyChanged(dependency_path),
                                ));
                                pusher.do_send(CancelPush(typegraph_module));
                            }
                        }
                    }
                    log::debug!("Watcher event channel closed.");
                });

                {
                    let loader = loader.clone();
                    ctrlc::set_handler(move || {
                        watcher.do_send(actors::watcher::Stop);
                        loader.do_send(loader::TryStop(StopBehavior::Stop));
                    })?;
                }

                match loader::stopped(loader).await {
                    Ok(StopBehavior::Stop) => {
                        break;
                    }
                    Ok(StopBehavior::Restart) => continue,
                    Err(e) => {
                        panic!("Loader actor stopped unexpectedly: {e:?}");
                    }
                }
            }
        } else {
            todo!("non watch mode");
        }
        Ok(())
    }
}

// #[derive(Debug)]
// pub struct PushRetry {
//     pub id: RetryId,
//     pub tg: Typegraph,
//     pub retry_no: u32,
// }

// impl Deploy<WatchModeData> {
//     async fn reload_all_from_discovery(&mut self) -> Result<()> {
//         let discovered = self.discovery().await?;
//         if discovered.is_empty() {
//             warn!("No typegraph definition module found.");
//         }
//
//         for path in discovered.into_iter() {
//             self.mode_data.queue.push(path);
//         }
//         Ok(())
//     }
//
//     async fn file_modified(&mut self, path: PathBuf) -> Result<WatchModeRestart> {
//         if &path == self.config.path.as_ref().unwrap() {
//             warn!("Metatype config file has been modified.");
//             warn!("Reloading everything...");
//             // reload everything
//             return Ok(WatchModeRestart(true));
//         }
//
//         let w = &mut self.mode_data;
//
//         let rdeps = w.dependency_graph.get_rdeps(&path);
//         if !rdeps.is_empty() {
//             let rel_path = diff_paths(&path, &self.base_dir).unwrap();
//             info!("File modified: {rel_path:?}");
//             for path in rdeps.into_iter() {
//                 let rel_path = diff_paths(&path, &self.base_dir).unwrap();
//                 info!("- Reloading dependency: {rel_path:?}");
//                 w.queue.push(path);
//             }
//             return Ok(WatchModeRestart(false));
//         }
//
//         let mut searcher = SearcherBuilder::new()
//             .binary_detection(BinaryDetection::none())
//             .build();
//
//         if !w.file_filter.is_excluded(&path, &mut searcher) {
//             let rel_path = diff_paths(&path, &self.base_dir).unwrap();
//             info!("Reloading: file modified {:?}...", rel_path);
//             w.retry_manager.cancel_all(&path);
//             w.queue.push(path);
//         }
//         Ok(WatchModeRestart(false))
//     }
//
//     fn file_deleted(&mut self, path: PathBuf) {
//         self.mode_data.dependency_graph.remove_typegraph_at(&path);
//     }
//
//     #[async_recursion]
//     async fn push_typegraph(&mut self, tg: Typegraph, retry_no: u32) {
//         let tg_name = tg.full_name().unwrap().cyan();
//
//         info!(
//             "Pushing typegraph {tg_name}{}...",
//             if retry_no > 0 {
//                 format!(" (retry {}/{})", retry_no, self.mode_data.retry_max).dimmed()
//             } else {
//                 String::default().dimmed()
//             }
//         );
//         match self.push_config.push(&tg).await {
//             Ok(res) => match self.handle_push_result(res) {
//                 HandlePushResult::Success => {}
//                 // HandlePushResult::Failure => self.schedule_retry(tg, retry_no + 1),
//                 HandlePushResult::Failure => {}
//                 HandlePushResult::PushAgain { reset_database } => {
//                     let mut tg = tg;
//                     if !reset_database.is_empty() {
//                         EmbeddedPrismaMigrationOptionsPatch::default()
//                             .reset_on_drift(true)
//                             .apply(&mut tg, reset_database)
//                             .unwrap();
//                     }
//                     info!("Repushing typegraph {tg_name} with new flags.");
//                     self.push_typegraph(tg, 0).await;
//                 }
//             },
//             Err(e) => {
//                 error!("Error while pushing typegraph {tg_name}: {e:?}");
//                 self.schedule_retry(tg, retry_no + 1);
//             }
//         }
//     }
//
//     fn schedule_retry(&mut self, tg: Typegraph, retry_no: u32) {
//         if retry_no <= self.mode_data.retry_max {
//             warn!(
//                 "Retrying in {} seconds...",
//                 self.mode_data.retry_interval.as_secs()
//             );
//             let retry_id = self.mode_data.retry_manager.add(tg.path.clone().unwrap());
//             let retry_tx = self.mode_data.retry_tx.clone();
//             let retry_interval = self.mode_data.retry_interval;
//             tokio::task::spawn(async move {
//                 sleep(retry_interval).await;
//                 retry_tx
//                     .send(PushRetry {
//                         id: retry_id,
//                         tg,
//                         retry_no,
//                     })
//                     .unwrap();
//             });
//         }
//     }
//
//     async fn retry(&mut self, retry: PushRetry) -> Result<()> {
//         let state = self
//             .mode_data
//             .retry_manager
//             .remove(retry.id, retry.tg.path.as_ref().unwrap())
//             .with_context(|| {
//                 format!("Inconsistent state: retry #{} not found", retry.id.as_u32())
//             })?;
//
//         if let RetryState::Cancelled = state {
//             trace!(
//                 "Retry #{} has been cancelled for typegraph {} at {:?}",
//                 retry.id.as_u32(),
//                 retry.tg.full_name().unwrap().cyan(),
//                 diff_paths(retry.tg.path.as_ref().unwrap(), &self.base_dir).unwrap()
//             );
//         } else {
//             self.push_typegraph(retry.tg, retry.retry_no).await;
//         }
//         Ok(())
//     }
//
//     async fn run(mut self, file: Option<&PathBuf>) -> Result<WatchModeRestart> {
//         if let Some(file) = &file {
//             error!("Cannot enter watch mode with a single file {:?}:", file);
//             error!("Please re-run without the --file option.");
//             bail!("Cannot enter watch mode with a single file.");
//         }
//
//         info!("Entering watch mode...");
//
//         self.reload_all_from_discovery().await?;
//
//         // All the operations are sequential
//         // Typegraph reload cancels any queued reload or pending push (retry)
//
//         loop {
//             select! {
//                 biased;
//
//                 Some(path) = self.mode_data.watcher.next() => {
//                     if path.try_exists()? {
//                         let restart = self.file_modified(path).await?;
//                         if restart.0 {
//                             return Ok(restart);
//                         }
//                     }
//                     else {
//                         self.file_deleted(path);
//                     }
//                 }
//
//                 Some(retry) = self.mode_data.retry_rx.recv() => {
//                     self.retry(retry).await?;
//                 }
//
//                 Some(path) = self.mode_data.queue.next() => {
//                     let tgs = Self::load_typegraphs(
//                         &path, &self.base_dir,
//                         &self.loader,
//                         // OnRewrite::Skip
//                     ).await;
//                     match tgs {
//                         Err(e) => error!("{e:?}"),
//                         Ok(tgs) => {
//                             for tg in tgs.into_iter() {
//                                 self.mode_data.dependency_graph.update_typegraph(&tg);
//                                 self.push_typegraph(tg, 0).await;
//                             }
//                         }
//                     }
//                 }
//
//             }
//         }
//     }
// }
