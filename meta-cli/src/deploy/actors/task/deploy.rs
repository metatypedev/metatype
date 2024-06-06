// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod migration_resolution;
mod migrations;

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupTaskConfig, OutputData, TaskAction,
    TaskActionGenerator,
};
use super::command::CommandBuilder;
use super::TaskConfig;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::{TaskManager, TaskRef};
use crate::interlude::*;
use crate::secrets::Secrets;
use color_eyre::owo_colors::OwoColorize;
use common::node::Node;
use serde::Deserialize;
use std::{path::Path, sync::Arc};
use tokio::process::Command;

pub type DeployAction = Arc<DeployActionInner>;

#[derive(Clone, Debug, Default, Serialize)]
pub struct MigrationAction {
    pub apply: bool,  // apply existing migrations
    pub create: bool, // create new migrations
    pub reset: bool,  // reset database if necessary
}

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct PrismaRuntimeId {
    pub typegraph: String,
    pub name: String,
}

#[derive(Debug)]
pub struct DeployActionInner {
    task_ref: TaskRef,
    task_config: Arc<TaskConfig>,
    node: Arc<Node>,
    secrets: Arc<Secrets>,
    migrations_dir: Arc<Path>,
    migration_actions: HashMap<PrismaRuntimeId, MigrationAction>,
    default_migration_action: MigrationAction,
}

#[derive(Clone)]
pub struct DeployActionGenerator {
    pub task_config: Arc<TaskConfig>,
    pub node: Arc<Node>,
    pub secrets: Arc<Secrets>,
    pub migrations_dir: Arc<Path>,
    pub default_migration_action: MigrationAction,
}

impl TaskActionGenerator for DeployActionGenerator {
    type Action = DeployAction;

    fn generate(&self, task_ref: TaskRef, followup: Option<FollowupDeployConfig>) -> Self::Action {
        let (default_migration_action, migration_actions) = if let Some(followup) = followup {
            (
                Default::default(),
                followup
                    .migrations
                    .into_iter()
                    .map(|(runtime, action_override)| {
                        (
                            runtime,
                            MigrationAction {
                                reset: matches!(
                                    action_override,
                                    MigrationActionOverride::ResetDatabase
                                ),
                                ..Default::default()
                            },
                        )
                    })
                    .collect(),
            )
        } else {
            (self.default_migration_action.clone(), HashMap::new())
        };

        DeployActionInner {
            task_ref,
            task_config: self.task_config.clone(),
            node: self.node.clone(),
            secrets: self.secrets.clone(),
            migrations_dir: self.migrations_dir.clone(),
            migration_actions,
            default_migration_action,
        }
        .into()
    }
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case", tag = "type", content = "text")]
pub enum MessageEntry {
    Info(String),
    Warning(String),
    Error(String),
}

#[derive(Deserialize, Debug)]
pub struct Migration {
    pub runtime: String,
    #[serde(rename = "migrations")]
    pub archive: String,
}

#[derive(Deserialize, Debug)]
pub struct DeploySuccess {
    pub typegraph: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migration>,
    pub failure: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct DeployError {
    typegraph: String,
    error: String,
    #[serde(default)]
    follow_up: Option<String>, // todo migration
}

impl OutputData for DeploySuccess {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
}

impl OutputData for DeployError {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
}

#[derive(Clone, Debug)]
pub enum MigrationActionOverride {
    ResetDatabase,
}

#[derive(Debug, Default)]
pub struct FollowupDeployConfig {
    pub migrations: Vec<(PrismaRuntimeId, MigrationActionOverride)>,
}

impl TaskAction for DeployAction {
    type SuccessData = DeploySuccess;
    type FailureData = DeployError;
    type Generator = DeployActionGenerator;
    type Followup = FollowupDeployConfig;

    async fn get_command(&self) -> Result<Command> {
        CommandBuilder {
            path: self
                .task_config
                .base_dir
                .to_path_buf()
                .join(&self.task_ref.path),
            task_config: self.task_config.clone(),
            action_env: "deploy",
        }
        .build()
        .await
    }

    fn get_start_message(&self) -> String {
        format!(
            "starting deployment process for {:?}",
            self.task_ref.path.display().yellow()
        )
    }

    fn get_error_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to deploy typegraph(s) from {path}: {err}",
            icon = "✗".red(),
            path = self.task_ref.path.display().yellow(),
            err = err,
        )
    }

    fn finalize(&self, res: &ActionResult<Self>, ctx: ActionFinalizeContext<Self>) {
        match res {
            Ok(data) => {
                let scope = format!("({path})", path = self.task_ref.path.display());
                let scope = scope.yellow();

                for message in &data.messages {
                    match message {
                        MessageEntry::Info(info) => ctx.console.info(format!("{scope} {info}")),
                        MessageEntry::Warning(warning) => {
                            ctx.console.warning(format!("{scope} {warning}"))
                        }
                        MessageEntry::Error(error) => ctx.console.error(format!("{scope} {error}")),
                    }
                }

                let tg_name = data.get_typegraph_name();

                self.unpack_migrations(&tg_name, &data.migrations, &ctx, &scope);

                match &data.failure {
                    Some(failure) => {
                        ctx.console.error(format!(
                            "{icon} error while deploying typegraph {name} from {path}",
                            icon = "✗".red(),
                            name = tg_name.cyan(),
                            path = self.task_ref.path.display().yellow(),
                        ));

                        self.handle_push_failure(&tg_name, failure, &ctx, &scope);
                    }
                    None => {
                        ctx.console.info(format!(
                            "{icon} successfully deployed typegraph {name} from {path}",
                            icon = "✓".green(),
                            name = tg_name.cyan(),
                            path = self.task_ref.path.display().yellow(),
                        ));
                    }
                }
            }

            Err(data) => {
                ctx.console.error(format!(
                    "{icon} failed to deploy typegraph {name} from {path}: {err}",
                    icon = "✗".red(),
                    name = data.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                    err = data.error,
                ));
            }
        }
    }

    fn get_global_config(&self) -> serde_json::Value {
        serde_json::json!({
            "typegate": {
                "endpoint": self.node.base_url,
                "auth": self.node.auth,
            },
            "prefix": self.node.prefix,
        })
    }

    fn get_typegraph_config(&self, typegraph: &str) -> serde_json::Value {
        let migration_actions = self
            .migration_actions
            .iter()
            .filter_map(|(runtime, action)| {
                if runtime.typegraph == typegraph {
                    Some((runtime.name.clone(), action.clone()))
                } else {
                    None
                }
            })
            .collect::<HashMap<_, _>>();

        serde_json::json!({
            "secrets": self.secrets.get(typegraph),
            "artifactResolution": true,
            "migrationActions": migration_actions,
            "defaultMigrationAction": self.default_migration_action,
            "migrationsDir": self.migrations_dir.to_path_buf().join(typegraph),
        })
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }
}

impl FollowupTaskConfig<DeployAction> for FollowupDeployConfig {
    fn schedule(&self, task_manager: Addr<TaskManager<DeployAction>>) {
        todo!();
        // task_manager.do_send(AddFollowupTask)
    }
}
