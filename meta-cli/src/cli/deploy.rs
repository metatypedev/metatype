// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use super::{Action, CommonArgs, GenArgs};
use crate::config::Config;
use crate::deploy::actors;
use crate::deploy::actors::console::{Console, ConsoleActor};
use crate::deploy::actors::discovery::DiscoveryActor;
use crate::deploy::actors::loader::{
    self, LoaderActor, LoaderEvent, PostProcessOptions, ReloadModule, ReloadReason, StopBehavior,
};
use crate::deploy::actors::pusher::{Push, PusherActor};
use crate::deploy::actors::watcher::WatcherActor;
use crate::typegraph::postprocess::EmbedPrismaMigrations;
use crate::utils::{ensure_venv, Node};
use actix::prelude::*;
use anyhow::{bail, Context, Result};
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

        let node_config = config.node(&deploy.node, &deploy.target);
        let node = node_config.build(&dir).await?;

        Ok(Self {
            config,
            base_dir: dir.into(),
            options,
            node,
        })
    }
}

struct CtrlCHandlerData {
    watcher: Addr<WatcherActor>,
    loader: Addr<LoaderActor>,
}

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
            watch_mode::enter_watch_mode(deploy).await?;
        } else {
            let deploy = default_mode::DefaultMode::init(deploy).await?;
            deploy.run().await?;
        }
        Ok(())
    }
}

mod default_mode {
    //! non-watch mode

    // use crate::deploy::actors::pusher::PusherEvent;

    use crate::deploy::utils::push_lifecycle::PushLifecycle;

    use super::*;

    pub struct DefaultMode {
        deploy: Deploy,
        console: Addr<ConsoleActor>,
        loader: Addr<LoaderActor>,
        loader_event_rx: mpsc::UnboundedReceiver<LoaderEvent>,
        pusher: PushLifecycle,
    }

    impl DefaultMode {
        pub async fn init(deploy: Deploy) -> Result<Self> {
            let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();
            let secrets =
                lade_sdk::hydrate(deploy.node.env.clone(), deploy.base_dir.to_path_buf()).await?;

            let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let loader = LoaderActor::new(
                Arc::clone(&deploy.config),
                PostProcessOptions::default()
                    .deno_codegen(deploy.options.codegen)
                    .prisma(
                        (!deploy.options.no_migration).then_some(
                            EmbedPrismaMigrations::default()
                                .create_migration(deploy.options.create_migration),
                        ),
                    )
                    .allow_destructive(deploy.options.allow_destructive),
                console.clone(),
                loader_event_tx,
            )
            .auto_stop()
            .start();

            let (pusher_event_tx, pusher_event_rx) = mpsc::unbounded_channel();

            let pusher = PusherActor::new(
                Arc::clone(&deploy.config),
                console.clone(),
                deploy.base_dir.clone(),
                deploy.node.clone(),
                secrets,
                pusher_event_tx,
            )
            .start();

            let push_lifecycle = PushLifecycle::builder(pusher_event_rx, pusher).start();

            Ok(Self {
                deploy,
                console,
                loader,
                loader_event_rx,
                pusher: push_lifecycle,
            })
        }

        pub async fn run(self) -> Result<()> {
            let _discovery = DiscoveryActor::new(
                Arc::clone(&self.deploy.config),
                self.loader.clone(),
                self.console.clone(),
                Arc::clone(&self.deploy.base_dir),
            )
            .start();

            let loader = self.loader.clone();
            self.push_loaded_typegraphs();

            match loader::stopped(loader).await {
                Ok(StopBehavior::Restart) => unreachable!("LoaderActor should not restart"),
                Ok(StopBehavior::ExitSuccess) => Ok(()),
                Ok(StopBehavior::ExitFailure(msg)) => bail!("{msg}"),
                Err(e) => panic!("Loader actor stopped unexpectedly: {e:?}"),
            }
        }

        fn push_loaded_typegraphs(self) {
            let pusher = self.pusher.clone();
            let mut event_rx = self.loader_event_rx;

            Arbiter::current().spawn(async move {
                while let Some(event) = event_rx.recv().await {
                    match event {
                        LoaderEvent::Typegraph(tg) => {
                            // TODO await -- no queue
                            pusher.send(Push::new(tg.into())).await;
                        }
                        LoaderEvent::Stopped(b) => {
                            if let StopBehavior::ExitFailure(msg) = b {
                                panic!("{msg}");
                            }
                        }
                    }
                }
                log::trace!("Typegraph channel closed.");
                // pusher address will be dropped when both loops are done
            });
        }
    }
}

mod watch_mode {
    use std::time::Duration;

    use crate::deploy::utils::push_lifecycle::{LinearBackoff, PushLifecycle};

    use super::*;

    pub async fn enter_watch_mode(deploy: Deploy) -> Result<()> {
        let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

        let ctrlc_handler_data = Arc::new(Mutex::new(None));

        let data = ctrlc_handler_data.clone();
        ctrlc::set_handler(move || {
            let mut data = data.lock().unwrap();
            if let Some(CtrlCHandlerData { watcher, loader }) = data.take() {
                watcher.do_send(actors::watcher::Stop);
                loader.do_send(loader::TryStop(StopBehavior::ExitSuccess));
            }
        })
        .context("setting Ctrl-C handler")?;

        loop {
            let secrets =
                lade_sdk::hydrate(deploy.node.env.clone(), deploy.base_dir.to_path_buf()).await?;

            let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let loader = LoaderActor::new(
                Arc::clone(&deploy.config),
                PostProcessOptions::default()
                    .deno_codegen(deploy.options.codegen)
                    .prisma(
                        (!deploy.options.no_migration).then_some(
                            EmbedPrismaMigrations::default()
                                .create_migration(deploy.options.create_migration),
                        ),
                    )
                    .allow_destructive(deploy.options.allow_destructive),
                console.clone(),
                loader_event_tx,
            )
            .start();

            let (pusher_event_tx, pusher_event_rx) = mpsc::unbounded_channel();

            let pusher = PusherActor::new(
                Arc::clone(&deploy.config),
                console.clone(),
                deploy.base_dir.clone(),
                deploy.node.clone(),
                secrets,
                pusher_event_tx,
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

            let push_scheduler = PushLifecycle::builder(pusher_event_rx, pusher)
                .linear_backoff(Duration::from_secs(5), 3)
                .start();

            let actor_system = ActorSystem {
                console: console.clone(),
                watcher,
                loader: loader.clone(),
                pusher: push_scheduler.clone(),
            };

            actor_system.push_loaded_typegraphs(loader_event_rx);
            actor_system.handle_watch_events(watch_event_rx);
            actor_system.update_ctrlc_handler(ctrlc_handler_data.clone());

            match loader::stopped(loader).await {
                Ok(StopBehavior::ExitSuccess) => {
                    break;
                }
                Ok(StopBehavior::Restart) => continue,
                Ok(StopBehavior::ExitFailure(_)) => {
                    break;
                }
                Err(e) => {
                    panic!("Loader actor stopped unexpectedly: {e:?}");
                }
            }
        }

        Ok(())
    }

    struct ActorSystem {
        console: Addr<ConsoleActor>,
        watcher: Addr<WatcherActor>,
        loader: Addr<LoaderActor>,
        pusher: PushLifecycle<LinearBackoff>,
    }

    impl ActorSystem {
        fn push_loaded_typegraphs(&self, event_rx: mpsc::UnboundedReceiver<LoaderEvent>) {
            let pusher = self.pusher.clone();
            Arbiter::current().spawn(async move {
                let mut event_rx = event_rx;
                while let Some(event) = event_rx.recv().await {
                    match event {
                        LoaderEvent::Typegraph(tg) => {
                            pusher.send(Push::new(tg.into())).await;
                        }
                        LoaderEvent::Stopped(b) => {
                            if let StopBehavior::ExitFailure(msg) = b {
                                panic!("{msg}");
                            }
                        }
                    }
                }
                log::trace!("Typegraph channel closed.");
                // pusher address will be dropped when both loops are done
            });
        }

        fn handle_watch_events(
            &self,
            watch_event_rx: mpsc::UnboundedReceiver<actors::watcher::Event>,
        ) {
            let console = self.console.clone();
            let watcher = self.watcher.clone();
            let loader = self.loader.clone();
            let mut pusher = self.pusher.clone();
            Arbiter::current().spawn(async move {
                let mut watch_event_rx = watch_event_rx;
                while let Some(event) = watch_event_rx.recv().await {
                    use actors::watcher::Event as E;
                    match event {
                        E::ConfigChanged => {
                            console.warning("Metatype configuration file changed.".to_string());
                            console.warning("Reloading everything.".to_string());

                            loader.do_send(loader::TryStop(StopBehavior::Restart));
                            watcher.do_send(actors::watcher::Stop);
                        }
                        E::TypegraphModuleChanged { typegraph_module } => {
                            pusher.cancel_pending_push(&typegraph_module).await;
                            loader.do_send(ReloadModule(
                                typegraph_module.clone(),
                                ReloadReason::FileChanged,
                            ));
                        }
                        E::TypegraphModuleDeleted { typegraph_module } => {
                            // TODO registry
                            pusher.cancel_pending_push(&typegraph_module).await;
                            // TODO internally by the watcher??
                            watcher.do_send(actors::watcher::RemoveTypegraph(
                                typegraph_module.clone(),
                            ));
                            // TODO delete typegraph in typegate??
                        }
                        E::DependencyChanged {
                            typegraph_module,
                            dependency_path,
                        } => {
                            pusher.cancel_pending_push(&typegraph_module).await;
                            loader.do_send(ReloadModule(
                                typegraph_module.clone(),
                                ReloadReason::DependencyChanged(dependency_path),
                            ));
                        }
                    }
                }
                log::trace!("Watcher event channel closed.");
            });
        }

        fn update_ctrlc_handler(&self, data: Arc<Mutex<Option<CtrlCHandlerData>>>) {
            *data.lock().unwrap() = Some(CtrlCHandlerData {
                watcher: self.watcher.clone(),
                loader: self.loader.clone(),
            });
        }
    }
}
