// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use super::{Action, ConfigArgs, NodeArgs};
use crate::com::store::{Command, Endpoint, MigrationAction, ServerStore};
use crate::config::Config;
use crate::deploy::actors;
use crate::deploy::actors::console::{Console, ConsoleActor};
use crate::deploy::actors::discovery::DiscoveryActor;
use crate::deploy::actors::loader::{
    self, LoaderActor, LoaderEvent, ReloadModule, ReloadReason, StopBehavior,
};
use crate::deploy::actors::watcher::WatcherActor;
use crate::deploy::push::pusher::PushResult;
use crate::secrets::{RawSecrets, Secrets};
use actix::prelude::*;
use actix_web::dev::ServerHandle;
use anyhow::{bail, Context, Result};
use async_trait::async_trait;
use clap::Parser;
use log::warn;
use normpath::PathExt;
use tokio::sync::mpsc;

#[derive(Parser, Debug)]
pub struct DeploySubcommand {
    #[command(flatten)]
    node: NodeArgs,

    /// Target typegate (cf config)
    #[clap(short, long)]
    pub target: String,

    /// Load specific typegraph from a file
    #[clap(short, long)]
    file: Option<PathBuf>,

    #[command(flatten)]
    options: DeployOptions,

    #[clap(long)]
    max_parallel_loads: Option<usize>,
}

impl DeploySubcommand {
    pub fn new(
        node: NodeArgs,
        target: String,
        options: DeployOptions,
        file: Option<PathBuf>,
        max_parallel_loads: Option<usize>,
    ) -> Self {
        Self {
            node,
            target,
            options,
            file,
            max_parallel_loads,
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

    /// Overrides secrets in the format `[<typegraph-name>:]<secret-name>=<value>`
    #[clap(long = "secret")]
    pub secrets: Vec<String>,
}

pub struct Deploy {
    config: Arc<Config>,
    base_dir: Arc<Path>,
    options: DeployOptions,
    secrets: RawSecrets,
    file: Option<Arc<Path>>,
    max_parallel_loads: Option<usize>,
}

impl Deploy {
    pub async fn new(deploy: &DeploySubcommand, args: &ConfigArgs) -> Result<Self> {
        let dir = args.dir()?;

        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path, &dir)?);

        let options = deploy.options.clone();

        let node_config = config.node(&deploy.node, &deploy.target);
        let secrets = Secrets::load_from_node_config(&node_config);
        let node = node_config
            .build(&dir)
            .await
            .with_context(|| format!("error while building node from config: {node_config:#?}"))?;

        ServerStore::with(Some(Command::Deploy), Some(config.as_ref().to_owned()));
        ServerStore::set_migration_action_glob(MigrationAction {
            create: deploy.options.create_migration,
            reset: deploy.options.allow_destructive, // reset on drift
        });
        ServerStore::set_endpoint(Endpoint {
            typegate: node.base_url.clone().into(),
            auth: node.auth.clone(),
        });
        ServerStore::set_prefix(node_config.prefix);
        ServerStore::set_codegen_flag(deploy.options.codegen);

        Ok(Self {
            config,
            base_dir: dir.into(),
            options,
            secrets,
            file: deploy
                .file
                .as_ref()
                .map(|f| f.normalize())
                .transpose()?
                .map(|f| f.into_path_buf().into()),
            max_parallel_loads: deploy.max_parallel_loads,
        })
    }
}

struct CtrlCHandlerData {
    watcher: Addr<WatcherActor>,
    loader: Addr<LoaderActor>,
}

#[async_trait]
impl Action for DeploySubcommand {
    async fn run(&self, args: ConfigArgs, server_handle: Option<ServerHandle>) -> Result<()> {
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
            // watch the content of a folder
            if self.file.is_some() {
                bail!("Cannot use --file in watch mode");
            }
            watch_mode::enter_watch_mode(deploy).await?;
        } else {
            // deploy a single file
            let deploy = default_mode::DefaultMode::init(deploy).await?;
            deploy.run().await?;

            server_handle.unwrap().stop(true).await;
        }

        Ok(())
    }
}

mod default_mode {
    //! non-watch mode
    use default_mode::actors::loader::LoadModule;

    use super::*;

    pub struct DefaultMode {
        deploy: Deploy,
        console: Addr<ConsoleActor>,
        loader: Addr<LoaderActor>,
        loader_event_rx: mpsc::UnboundedReceiver<LoaderEvent>,
    }

    impl DefaultMode {
        pub async fn init(deploy: Deploy) -> Result<Self> {
            let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

            let mut secrets = deploy.secrets.clone();
            secrets.apply_overrides(&deploy.options.secrets)?;

            ServerStore::set_secrets(secrets.hydrate(deploy.base_dir.clone()).await?);

            let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let loader = LoaderActor::new(
                Arc::clone(&deploy.config),
                console.clone(),
                loader_event_tx,
                deploy.max_parallel_loads.unwrap_or_else(num_cpus::get),
            )
            .auto_stop()
            .start();

            Ok(Self {
                deploy,
                console,
                loader,
                loader_event_rx,
            })
        }

        pub async fn run(self) -> Result<()> {
            log::debug!("file: {:?}", self.deploy.file);
            let _discovery = if let Some(file) = self.deploy.file.clone() {
                self.loader.do_send(LoadModule(file.to_path_buf().into()));
                None
            } else {
                Some(
                    DiscoveryActor::new(
                        Arc::clone(&self.deploy.config),
                        self.loader.clone(),
                        self.console.clone(),
                        Arc::clone(&self.deploy.base_dir),
                    )
                    .start(),
                )
            };

            let loader = self.loader.clone();
            self.handle_loaded_typegraphs();

            match loader::stopped(loader).await {
                Ok(StopBehavior::Restart) => unreachable!("LoaderActor should not restart"),
                Ok(StopBehavior::ExitSuccess) => Ok(()),
                Ok(StopBehavior::ExitFailure(msg)) => bail!("{msg}"),
                Err(e) => panic!("Loader actor stopped unexpectedly: {e:?}"),
            }
        }

        fn handle_loaded_typegraphs(self) {
            let mut event_rx = self.loader_event_rx;
            let console = self.console.clone();
            Arbiter::current().spawn(async move {
                while let Some(event) = event_rx.recv().await {
                    match event {
                        LoaderEvent::Typegraph(tg_infos) => {
                            match tg_infos.get_responses_or_fail() {
                                Ok(res) => {
                                    for (name, res) in res.iter() {
                                        match PushResult::new(
                                            self.console.clone(),
                                            self.loader.clone(),
                                            res.clone(),
                                        ) {
                                            Ok(push) => push.finalize().await.unwrap(),
                                            Err(e) => {
                                                console.error(format!(
                                                    "Failed pushing typegraph {:?} at {}:\n{:?}",
                                                    name,
                                                    tg_infos.path.display(),
                                                    e.to_string()
                                                ));
                                            }
                                        }
                                    }
                                }
                                Err(e) => panic!("{}", e.to_string()),
                            }
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

    use watch_mode::actors::loader::LoadModule;

    use crate::deploy::push::pusher::RetryManager;

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
            let mut secrets = deploy.secrets.clone();
            secrets.apply_overrides(&deploy.options.secrets)?;

            ServerStore::set_secrets(secrets.hydrate(deploy.base_dir.clone()).await?);

            let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let loader = LoaderActor::new(
                Arc::clone(&deploy.config),
                console.clone(),
                loader_event_tx,
                deploy.max_parallel_loads.unwrap_or_else(num_cpus::get),
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

            let actor_system = ActorSystem {
                console: console.clone(),
                watcher,
                loader: loader.clone(),
            };

            actor_system.handle_loaded_typegraphs(loader_event_rx);
            actor_system.handle_watch_events(watch_event_rx);
            actor_system.update_ctrlc_handler(ctrlc_handler_data.clone());

            // TODO wait for push lifecycle
            match loader::stopped(loader).await {
                Ok(StopBehavior::ExitSuccess) => {
                    break;
                }
                Ok(StopBehavior::Restart) => {
                    continue;
                }
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
    }

    impl ActorSystem {
        fn handle_loaded_typegraphs(&self, event_rx: mpsc::UnboundedReceiver<LoaderEvent>) {
            let console = self.console.clone();
            let loader = self.loader.clone();
            Arbiter::current().spawn(async move {
                let mut event_rx = event_rx;
                while let Some(event) = event_rx.recv().await {
                    match event {
                        LoaderEvent::Typegraph(tg_infos) => {
                            let responses = ServerStore::get_responses_or_fail(&tg_infos.path)
                                .unwrap()
                                .as_ref()
                                .to_owned();
                            for (name, response) in responses.into_iter() {
                                match PushResult::new(console.clone(), loader.clone(), response) {
                                    Ok(push) => {
                                        if let Err(e) = push.finalize().await {
                                            panic!("{}", e.to_string());
                                        }
                                        RetryManager::clear_counter(&tg_infos.path);
                                    }
                                    Err(e) => {
                                        let tg_path = tg_infos.path.clone();
                                        console.error(format!(
                                            "Failed pushing typegraph {} at {:?}:\n{:?}",
                                            name,
                                            tg_path.display(),
                                            e.to_string()
                                        ));
                                        if let Some(delay) = RetryManager::next_delay(&tg_path) {
                                            console.info(format!(
                                                "Retry {}/{}, retrying after {}s of {:?}",
                                                delay.retry,
                                                delay.max,
                                                delay.duration.as_secs(),
                                                tg_path.display(),
                                            ));
                                            tokio::time::sleep(delay.duration).await;
                                            loader.do_send(LoadModule(Arc::new(tg_path)));
                                        }
                                    }
                                }
                            }
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
            Arbiter::current().spawn(async move {
                let mut watch_event_rx = watch_event_rx;
                while let Some(event) = watch_event_rx.recv().await {
                    use actors::watcher::Event as E;
                    match event {
                        E::ConfigChanged => {
                            RetryManager::reset();

                            console.warning("Metatype configuration file changed.".to_string());
                            console.warning("Reloading everything.".to_string());

                            loader.do_send(loader::TryStop(StopBehavior::Restart));
                            watcher.do_send(actors::watcher::Stop);
                        }
                        E::TypegraphModuleChanged { typegraph_module } => {
                            RetryManager::clear_counter(&typegraph_module);
                            loader.do_send(ReloadModule(
                                typegraph_module.into(),
                                ReloadReason::FileChanged,
                            ));
                        }
                        E::TypegraphModuleDeleted { typegraph_module } => {
                            RetryManager::clear_counter(&typegraph_module);

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
                            RetryManager::clear_counter(&typegraph_module);

                            loader.do_send(ReloadModule(
                                typegraph_module.into(),
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
