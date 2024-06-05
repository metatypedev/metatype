// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use self::actors::task::deploy::{DeployAction, DeployActionGenerator};
use self::actors::task::TaskConfig;
use self::actors::task_manager::{self, StopReason, TaskReason};
use super::{Action, ConfigArgs, NodeArgs};
use crate::com::store::{Command, Endpoint, ServerStore};
use crate::config::Config;
use crate::deploy::actors;
use crate::deploy::actors::console::ConsoleActor;
use crate::deploy::actors::discovery::DiscoveryActor;
use crate::deploy::actors::task_manager::TaskManager;
use crate::deploy::actors::watcher::{self, WatcherActor};
use crate::interlude::*;
use crate::secrets::{RawSecrets, Secrets};
use actix_web::dev::ServerHandle;
use clap::Parser;
use common::node::Node;
use futures::channel::oneshot;
use owo_colors::OwoColorize;

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

#[derive(Debug)]
pub struct Deploy {
    config: Arc<Config>,
    node: Node,
    base_dir: Arc<Path>,
    options: DeployOptions,
    secrets: RawSecrets,
    file: Option<Arc<Path>>,
    max_parallel_loads: Option<usize>,
}

impl Deploy {
    #[tracing::instrument(level = "debug")]
    pub async fn new(deploy: &DeploySubcommand, args: &ConfigArgs) -> Result<Self> {
        let dir: Arc<Path> = args.dir().into();

        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path, &dir)?);

        let options = deploy.options.clone();

        let node_config = config.node(&deploy.node, &deploy.target);
        let secrets = Secrets::load_from_node_config(&node_config);
        debug!(
            "validating configuration for target {:?}",
            deploy.target.yellow()
        );
        let node = node_config
            .build(&dir)
            .await
            .context("error while building node from config")?;

        ServerStore::with(Some(Command::Deploy), Some(config.as_ref().to_owned()));
        // ServerStore::set_migration_action_glob(MigrationAction {
        //     create: deploy.options.create_migration,
        //     reset: deploy.options.allow_destructive, // reset on drift
        // });
        ServerStore::set_endpoint(Endpoint {
            typegate: node.base_url.clone().into(),
            auth: node.auth.clone(),
        });
        ServerStore::set_prefix(node_config.prefix);
        ServerStore::set_codegen_flag(deploy.options.codegen);

        let file = deploy.file.clone();
        // let file = deploy
        //     .file
        //     .as_ref()
        //     .map(|f| f.normalize())
        //     .transpose()?
        //     .map(|f| f.into_path_buf());
        if let Some(file) = &file {
            if let Err(err) = crate::config::ModuleType::try_from(file.as_path()) {
                bail!("file is not a valid module type: {err:#}")
            }
        }
        Ok(Self {
            config,
            node,
            base_dir: dir.clone(),
            options,
            secrets,
            file: file.map(|path| path.into()),
            max_parallel_loads: deploy.max_parallel_loads,
        })
    }
}

struct CtrlCHandlerData {
    watcher: Addr<WatcherActor>,
    task_manager: Addr<TaskManager<DeployAction>>,
}

#[async_trait]
impl Action for DeploySubcommand {
    #[tracing::instrument(level = "debug")]
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

        let status = if deploy.options.watch {
            info!("running in watch mode");
            // watch the content of a folder
            if self.file.is_some() {
                bail!("Cannot use --file in watch mode");
            }
            watch_mode::enter_watch_mode(deploy).await?;

            ExitStatus::Failure
        } else {
            trace!("running in default mode");
            // deploy a single file
            let deploy = default_mode::DefaultMode::init(deploy).await?;
            let status = deploy.run().await?;

            server_handle.unwrap().stop(true).await;

            status
        };

        match status {
            ExitStatus::Success => Ok(()),
            ExitStatus::Failure => Err(eyre::eyre!("failed")),
        }
    }
}

enum ExitStatus {
    Success,
    Failure,
}

mod default_mode {
    //! non-watch mode

    use crate::{cli::deploy::default_mode::actors::task::TaskFinishStatus, config::PathOption};

    use self::actors::task::deploy::MigrationAction;

    use super::*;

    pub struct DefaultMode {
        deploy: Deploy,
        console: Addr<ConsoleActor>,
        task_manager: Addr<TaskManager<DeployAction>>,
        report_rx: oneshot::Receiver<task_manager::Report<DeployAction>>,
        // loader_event_rx: mpsc::UnboundedReceiver<LoaderEvent>,
    }

    impl DefaultMode {
        pub async fn init(deploy: Deploy) -> Result<Self> {
            let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

            let mut secrets = deploy.secrets.clone();
            secrets.apply_overrides(&deploy.options.secrets)?;

            // ServerStore::set_secrets(secrets.hydrate(deploy.base_dir.clone()).await?);

            // let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let (report_tx, report_rx) = oneshot::channel();

            let task_config = TaskConfig::init(deploy.base_dir.clone());
            let action_generator = DeployActionGenerator {
                task_config: task_config.into(),
                node: deploy.node.clone().into(),
                secrets: secrets.hydrate(deploy.base_dir.clone()).await?.into(),
                migrations_dir: deploy
                    .config
                    .prisma_migrations_base_dir(PathOption::Absolute)
                    .into(),
                default_migration_action: MigrationAction {
                    apply: true,
                    create: deploy.options.create_migration,
                    reset: deploy.options.allow_destructive,
                },
            };

            let task_manager = TaskManager::new(
                deploy.config.clone(),
                action_generator,
                deploy.max_parallel_loads.unwrap_or_else(num_cpus::get),
                report_tx,
                console.clone(),
            )
            .auto_stop()
            .start();

            Ok(Self {
                deploy,
                console,
                task_manager,
                report_rx,
            })
        }

        pub async fn run(self) -> Result<ExitStatus> {
            debug!(file = ?self.deploy.file);

            {
                let task_manager = self.task_manager.clone();
                ctrlc::set_handler(move || {
                    debug!("CTRL-C handler");
                    task_manager.do_send(task_manager::message::Stop);
                    // loader.do_send(loader::TryStop(StopBehavior::ExitSuccess));
                })
            }
            .context("setting Ctrl-C handler")?;
            let _discovery = if let Some(path) = self.deploy.file.clone() {
                self.task_manager.do_send(task_manager::message::AddTask {
                    path,
                    reason: TaskReason::Discovery,
                });
                // self.loader.do_send(LoadModule(file.to_path_buf().into()));
                None
            } else {
                Some(
                    DiscoveryActor::new(
                        Arc::clone(&self.deploy.config),
                        self.task_manager.clone(),
                        self.console.clone(),
                        Arc::clone(&self.deploy.base_dir),
                    )
                    .start(),
                )
            };

            let report = self.report_rx.await?;
            let summary = report.summary();
            println!("Result:\n{}", summary.text);

            match report.stop_reason {
                StopReason::Natural => {
                    if summary.success {
                        Ok(ExitStatus::Success)
                    } else {
                        Ok(ExitStatus::Failure)
                    }
                }
                StopReason::Restart => {
                    unreachable!("TaskManager should not restart on the default mode")
                }
                StopReason::Manual => {
                    if summary.success {
                        Ok(ExitStatus::Success)
                    } else {
                        Ok(ExitStatus::Failure)
                    }
                } // TODO read report
                StopReason::ManualForced => Ok(ExitStatus::Failure),
                StopReason::Error => {
                    // error should have already been reported
                    Ok(ExitStatus::Failure)
                }
            }
        }

        // #[tracing::instrument(skip(self))]
        // fn handle_loaded_typegraphs(self) -> oneshot::Receiver<Result<()>> {
        //     let mut event_rx = self.loader_event_rx;
        //     let console = self.console.clone();
        //     let (tx, rx) = oneshot::channel();
        //     let fut = async move {
        //         let mut errors = vec![];
        //         while let Some(event) = event_rx.recv().await {
        //             match event {
        //                 LoaderEvent::Typegraph(tg_infos) => {
        //                     let responses = match tg_infos.get_responses_or_fail() {
        //                         Ok(val) => val,
        //                         Err(err) => {
        //                             console.error(format!(
        //                                 "failed pushing typegraph at {:?}: {err:#}",
        //                                 tg_infos.path.display().cyan(),
        //                             ));
        //                             errors.push((tg_infos.path.clone(), err));
        //                             continue;
        //                         }
        //                     };
        //                     for (name, res) in responses.iter() {
        //                         match PushResult::new(
        //                             self.console.clone(),
        //                             self.loader.clone(),
        //                             res.clone(),
        //                         ) {
        //                             Ok(push) => push.finalize().await.unwrap(),
        //                             Err(err) => {
        //                                 console.error(format!(
        //                                     "failed pushing typegraph {:?} at {:?}: {err:#}",
        //                                     name.yellow(),
        //                                     tg_infos.path.display().cyan(),
        //                                 ));
        //                                 errors.push((tg_infos.path.clone(), err));
        //                             }
        //                         }
        //                     }
        //                 }
        //                 LoaderEvent::Stopped(b) => {
        //                     if let StopBehavior::ExitFailure(msg) = b {
        //                         error!("LoaderActor exit failure: {}", msg.red());
        //                     }
        //                 }
        //             }
        //         }
        //         trace!("typegraph channel closed.");
        //         if errors.is_empty() {
        //             tx.send(Ok(())).unwrap_or_log();
        //         } else {
        //             tx.send(Err(errors.into_iter().fold(
        //                 ferr!("loader encountered errors").suppress_backtrace(true),
        //                 |report, (path, err)| {
        //                     report.section(
        //                         format!("{}", format!("{err:#}").red())
        //                             .header(format!("{}:", path.display().purple())),
        //                     )
        //                 },
        //             )))
        //             .unwrap_or_log();
        //         }
        //         // pusher address will be dropped when both loops are done
        //     };
        //     Arbiter::current().spawn(fut.in_current_span());
        //     rx
        // }
    }
}

mod watch_mode {
    use crate::config::PathOption;

    use self::actors::task::deploy::MigrationAction;

    use super::*;

    #[tracing::instrument]
    pub async fn enter_watch_mode(deploy: Deploy) -> Result<()> {
        let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

        let ctrlc_handler_data = Arc::new(std::sync::Mutex::new(None));

        let data = ctrlc_handler_data.clone();
        ctrlc::set_handler(move || {
            let mut data = data.lock().unwrap();
            if let Some(CtrlCHandlerData {
                watcher,
                task_manager,
            }) = data.take()
            {
                watcher.do_send(watcher::message::Stop);
                task_manager.do_send(task_manager::message::Stop);
            }
        })
        .context("setting Ctrl-C handler")?;

        let task_config = TaskConfig::init(deploy.base_dir.clone());
        let mut secrets = deploy.secrets.clone();
        secrets.apply_overrides(&deploy.options.secrets)?;

        let action_generator = DeployActionGenerator {
            task_config: task_config.into(),
            node: deploy.node.into(),
            secrets: secrets.hydrate(deploy.base_dir.clone()).await?.into(),
            migrations_dir: deploy
                .config
                .prisma_migrations_base_dir(PathOption::Absolute)
                .into(),
            default_migration_action: MigrationAction {
                apply: true,
                create: deploy.options.create_migration,
                reset: deploy.options.allow_destructive,
            },
        };

        loop {
            // ServerStore::set_secrets(secrets.hydrate(deploy.base_dir.clone()).await?);

            // let (loader_event_tx, loader_event_rx) = mpsc::unbounded_channel();

            let (report_tx, report_rx) = oneshot::channel();

            let task_manager = TaskManager::new(
                deploy.config.clone(),
                action_generator.clone(),
                deploy.max_parallel_loads.unwrap_or_else(num_cpus::get),
                report_tx,
                console.clone(),
            )
            .start();

            let _discovery = DiscoveryActor::new(
                Arc::clone(&deploy.config),
                task_manager.clone(),
                console.clone(),
                Arc::clone(&deploy.base_dir),
            )
            .start();

            let watcher = WatcherActor::new(
                Arc::clone(&deploy.config),
                deploy.base_dir.clone(),
                task_manager.clone(),
                console.clone(),
            )?
            .start();

            let actor_system = ActorSystem {
                console: console.clone(),
                watcher,
                task_manager: task_manager.clone(),
            };

            // actor_system.handle_loaded_typegraphs(loader_event_rx);
            // actor_system.handle_watch_events(watch_event_rx);
            actor_system.update_ctrlc_handler(ctrlc_handler_data.clone());

            let report = report_rx.await?;

            match report.stop_reason {
                StopReason::Natural => {
                    unreachable!("TaskManager should not stop naturally on watch mode")
                }
                StopReason::Restart => {
                    continue;
                }
                StopReason::Manual => {
                    return Err(eyre::eyre!("tasks manually stopped"));
                }
                StopReason::ManualForced => {
                    return Err(eyre::eyre!("tasks manually stopped (forced)"));
                }
                StopReason::Error => return Err(eyre::eyre!("failed")),
            }
        }
    }

    struct ActorSystem {
        console: Addr<ConsoleActor>,
        watcher: Addr<WatcherActor>,
        task_manager: Addr<TaskManager<DeployAction>>,
    }

    impl ActorSystem {
        // #[tracing::instrument(skip(self))]
        // fn handle_loaded_typegraphs(&self, event_rx: mpsc::UnboundedReceiver<LoaderEvent>) {
        //     let console = self.console.clone();
        //     let loader = self.loader.clone();
        //     let fut = async move {
        //         let mut event_rx = event_rx;
        //         while let Some(event) = event_rx.recv().await {
        //             match event {
        //                 LoaderEvent::Typegraph(tg_infos) => {
        //                     let responses = ServerStore::get_responses_or_fail(&tg_infos.path)
        //                         .unwrap_or_log()
        //                         .as_ref()
        //                         .to_owned();
        //                     for (name, response) in responses.into_iter() {
        //                         match PushResult::new(console.clone(), loader.clone(), response) {
        //                             Ok(push) => {
        //                                 if let Err(err) = push.finalize().await {
        //                                     panic!("{err:#}");
        //                                 }
        //                                 RetryManager::clear_counter(&tg_infos.path);
        //                             }
        //                             Err(err) => {
        //                                 let tg_path = tg_infos.path.clone();
        //                                 console.error(format!(
        //                                     "failed pushing typegraph {name:?} at {tg_path:?}: {err:#}",
        //                                 ));
        //                                 if let Some(delay) = RetryManager::next_delay(&tg_path) {
        //                                     console.info(format!(
        //                                         "retry {}/{}, retrying after {}s of {:?}",
        //                                         delay.retry,
        //                                         delay.max,
        //                                         delay.duration.as_secs(),
        //                                         tg_path.display(),
        //                                     ));
        //                                     tokio::time::sleep(delay.duration).await;
        //                                     loader.do_send(LoadModule(Arc::new(tg_path)));
        //                                 }
        //                             }
        //                         }
        //                     }
        //                 }
        //                 LoaderEvent::Stopped(b) => {
        //                     if let StopBehavior::ExitFailure(msg) = b {
        //                         panic!("{msg}");
        //                     }
        //                 }
        //             }
        //         }
        //         trace!("Typegraph channel closed.");
        //         // pusher address will be dropped when both loops are done
        //     };
        //     Arbiter::current().spawn(fut.in_current_span());
        // }

        // #[tracing::instrument(skip(self))]
        // fn handle_watch_events(
        //     &self,
        //     watch_event_rx: mpsc::UnboundedReceiver<actors::watcher::Event>,
        // ) {
        //     let console = self.console.clone();
        //     let watcher = self.watcher.clone();
        //     let loader = self.loader.clone();
        //     let fut = async move {
        //         let mut watch_event_rx = watch_event_rx;
        //         while let Some(event) = watch_event_rx.recv().await {
        //             use actors::watcher::Event as E;
        //             match event {
        //                 E::ConfigChanged => {
        //                     RetryManager::reset();
        //
        //                     console.warning("metatype configuration file changed".to_string());
        //                     console.warning("reloading everything".to_string());
        //
        //                     loader.do_send(loader::TryStop(StopBehavior::Restart));
        //                     watcher.do_send(actors::watcher::Stop);
        //                 }
        //                 E::TypegraphModuleChanged { typegraph_module } => {
        //                     RetryManager::clear_counter(&typegraph_module);
        //                     loader.do_send(ReloadModule(
        //                         typegraph_module.into(),
        //                         ReloadReason::FileChanged,
        //                     ));
        //                 }
        //                 E::TypegraphModuleDeleted { typegraph_module } => {
        //                     RetryManager::clear_counter(&typegraph_module);
        //
        //                     // TODO internally by the watcher??
        //                     watcher.do_send(actors::watcher::RemoveTypegraph(
        //                         typegraph_module.clone(),
        //                     ));
        //                     // TODO delete typegraph in typegate??
        //                 }
        //                 E::DependencyChanged {
        //                     typegraph_module,
        //                     dependency_path,
        //                 } => {
        //                     RetryManager::clear_counter(&typegraph_module);
        //
        //                     loader.do_send(ReloadModule(
        //                         typegraph_module.into(),
        //                         ReloadReason::DependencyChanged(dependency_path),
        //                     ));
        //                 }
        //             }
        //         }
        //         trace!("watcher event channel closed");
        //     };
        //     Arbiter::current().spawn(fut.in_current_span());
        // }

        fn update_ctrlc_handler(&self, data: Arc<std::sync::Mutex<Option<CtrlCHandlerData>>>) {
            *data.lock().unwrap() = Some(CtrlCHandlerData {
                watcher: self.watcher.clone(),
                task_manager: self.task_manager.clone(),
            });
        }
    }
}
