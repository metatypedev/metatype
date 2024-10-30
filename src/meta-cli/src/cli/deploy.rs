// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use self::actors::task::deploy::{DeployAction, DeployActionGenerator};
use self::actors::task_manager::{self, StopReason};
use super::{Action, ConfigArgs, NodeArgs};
use crate::config::Config;
use crate::deploy::actors;
use crate::deploy::actors::console::ConsoleActor;
use crate::interlude::*;
use crate::secrets::{RawSecrets, Secrets};
use clap::Parser;
use common::node::Node;

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
}

impl DeploySubcommand {
    pub fn new(
        node: NodeArgs,
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

    // FIXME incompatible with non-watch mode
    #[cfg(feature = "typegate")]
    /// Run a typegate with the current target configuration
    #[clap(skip = None)]
    pub typegate_options: Option<super::typegate::Typegate>,

    /// maximum number of concurrent deployment tasks
    #[clap(long)]
    pub threads: Option<usize>,

    /// max retry count
    #[clap(long)]
    pub retry: Option<usize>,

    /// initial retry interval in milliseconds
    #[clap(long)]
    pub retry_interval_ms: Option<u64>,
}

#[derive(Debug)]
pub struct Deploy {
    config: Arc<Config>,
    node: Node,
    #[cfg(feature = "typegate")]
    node_config: crate::config::NodeConfig,
    base_dir: Arc<Path>,
    options: DeployOptions,
    secrets: RawSecrets,
    file: Option<PathBuf>,
}

impl Deploy {
    #[tracing::instrument]
    pub async fn new(deploy: &DeploySubcommand, args: &ConfigArgs) -> Result<Self> {
        let dir: Arc<Path> = args.dir()?.into();

        let config_path = args.config.clone();
        let config = Arc::new(Config::load_or_find(config_path.as_deref(), &dir)?);

        let options = deploy.options.clone();

        let node_config = config.node(&deploy.node, &deploy.target);
        let secrets = Secrets::load_from_node_config(&node_config, dir.to_path_buf());
        let node = node_config
            .build(&dir)
            .await
            .context("error while building node from config")?;

        let file = deploy.file.clone();
        if let Some(file) = &file {
            if let Err(err) = crate::config::ModuleType::try_from(file.as_path()) {
                bail!("file is not a valid module type: {err:#}")
            }
        }
        Ok(Self {
            config,
            node,
            #[cfg(feature = "typegate")]
            node_config,
            base_dir: dir.clone(),
            options,
            secrets,
            file: file.clone(),
        })
    }
}

#[async_trait]
impl Action for DeploySubcommand {
    #[tracing::instrument]
    async fn run(&self, args: ConfigArgs) -> Result<()> {
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

            default_mode::run(deploy).await?
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

    use std::time::Duration;

    use task_manager::{TaskManagerInit, TaskSource};

    use crate::config::PathOption;

    use super::*;

    pub async fn run(deploy: Deploy) -> Result<ExitStatus> {
        let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

        let mut secrets = deploy.secrets.clone();
        secrets.apply_overrides(&deploy.options.secrets)?;

        let action_generator = DeployActionGenerator::new(
            deploy.node.into(),
            secrets.into(),
            deploy.config.dir().unwrap_or_log().into(),
            deploy.base_dir.clone(),
            deploy
                .config
                .prisma_migrations_base_dir(PathOption::Absolute)
                .into(),
            deploy.options.create_migration,
            deploy.options.allow_destructive,
        );

        let mut init = TaskManagerInit::<DeployAction>::new(
            deploy.config.clone(),
            action_generator,
            console.clone(),
            if let Some(file) = &deploy.file {
                TaskSource::Static(vec![file.clone()])
            } else {
                TaskSource::Discovery(deploy.base_dir)
            },
        )
        .retry(
            deploy.options.retry.unwrap_or(0),
            deploy.options.retry_interval_ms.map(Duration::from_millis),
        );

        if let Some(max_parallel_tasks) = deploy.options.threads {
            init = init.max_parallel_tasks(max_parallel_tasks);
        }
        let report = init.run().await;

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
}

mod watch_mode {
    use std::time::Duration;

    use actors::typegate;
    use task_manager::{TaskManagerInit, TaskSource};

    use crate::config::PathOption;

    use super::*;

    #[tracing::instrument]
    pub async fn enter_watch_mode(deploy: Deploy) -> Result<()> {
        if deploy.file.is_some() {
            bail!("Cannot use --file in watch mode");
        }

        let console = ConsoleActor::new(Arc::clone(&deploy.config)).start();

        let mut secrets = deploy.secrets.clone();
        secrets.apply_overrides(&deploy.options.secrets)?;

        #[cfg(feature = "typegate")]
        let typegate_addr = if let Some(tg_opts) = deploy.options.typegate_options {
            use crate::deploy::actors::typegate::TypegateInit;
            info!("starting typegate");
            Some(
                TypegateInit::new(
                    &deploy.node_config,
                    &deploy.base_dir,
                    tg_opts.main_url,
                    tg_opts.import_map_url,
                )
                .await?
                .start(console.clone())
                .await?,
            )
        } else {
            None
        };

        let deploy_node = deploy.node.clone();
        let deploy_node = if let Some((_, port)) = typegate_addr.as_ref() {
            deploy_node.override_port(*port)
        } else {
            deploy_node
        };

        let action_generator = DeployActionGenerator::new(
            deploy_node.into(),
            secrets.into(),
            deploy.config.dir().unwrap_or_log().into(),
            deploy.base_dir.clone(),
            deploy
                .config
                .prisma_migrations_base_dir(PathOption::Absolute)
                .into(),
            deploy.options.create_migration,
            deploy.options.allow_destructive,
        );

        let mut init = TaskManagerInit::<DeployAction>::new(
            deploy.config.clone(),
            action_generator.clone(),
            console.clone(),
            TaskSource::DiscoveryAndWatch(deploy.base_dir),
        )
        .retry(
            deploy.options.retry.unwrap_or(3),
            deploy.options.retry_interval_ms.map(Duration::from_millis),
        );

        if let Some(max_parallel_tasks) = deploy.options.threads {
            init = init.max_parallel_tasks(max_parallel_tasks);
        }
        let report = init.run().await;

        if let Some((addr, _)) = typegate_addr {
            addr.do_send(typegate::message::Stop);
        }

        match report.stop_reason {
            StopReason::Natural => {
                unreachable!("TaskManager should not stop naturally on watch mode")
            }
            StopReason::Restart => {
                unreachable!("Restarting should not stop the TaskManager")
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
