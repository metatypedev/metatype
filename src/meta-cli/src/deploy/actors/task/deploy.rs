// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod migrations;

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupOption, OutputData, SharedActionConfig,
    TaskAction, TaskActionGenerator, TaskFilter,
};
use super::command::build_task_command;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::TaskRef;
use crate::interlude::*;
use crate::secrets::Secrets;
use crate::typegraph::rpc::{RpcCall as TypegraphRpcCall, RpcDispatch};
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

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct PrismaRuntimeId {
    pub typegraph: String,
    pub name: String,
}

#[derive(Debug)]
pub struct DeployActionInner {
    task_ref: TaskRef,
    task_options: DeployOptions,
    shared_config: Arc<SharedActionConfig>,
    deploy_target: Arc<Node>,
    secrets: Arc<Secrets>,
}

#[derive(Clone)]
pub struct DeployActionGenerator {
    node: Arc<Node>,
    secrets: Arc<Secrets>, // TODO secrets_store
    shared_config: Arc<SharedActionConfig>,
}

impl DeployActionGenerator {
    pub fn new(
        node: Arc<Node>,
        secrets: Arc<Secrets>,
        config_dir: Arc<Path>,
        working_dir: Arc<Path>,
        migrations_dir: Arc<Path>,
        create_migrations: bool,
        destructive_migrations: bool, // TODO enum { Fail, Reset, Ask }
    ) -> Self {
        Self {
            node,
            secrets,
            shared_config: SharedActionConfig {
                command: "deploy",
                config_dir,
                working_dir,
                migrations_dir,
                default_migration_action: MigrationAction {
                    apply: true,
                    create: create_migrations,
                    reset: destructive_migrations,
                },
                artifact_resolution: true,
            }
            .into(),
        }
    }
}

impl TaskActionGenerator for DeployActionGenerator {
    type Action = DeployAction;

    fn generate(&self, task_ref: TaskRef, task_options: DeployOptions) -> Self::Action {
        DeployActionInner {
            task_ref,
            task_options,
            shared_config: self.shared_config.clone(),
            deploy_target: self.node.clone(),
            secrets: self.secrets.clone(),
        }
        .into()
    }

    fn get_shared_config(&self) -> Arc<SharedActionConfig> {
        self.shared_config.clone()
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
    errors: Vec<String>,
}

impl OutputData for DeploySuccess {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }

    fn is_success(&self) -> bool {
        self.failure.is_none()
    }
}

impl OutputData for DeployError {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
    fn is_success(&self) -> bool {
        false
    }
}

#[derive(Debug, Default)]
pub struct DeployOptions {
    filter: TaskFilter,
    migration_options: Vec<(PrismaRuntimeId, MigrationActionOverride)>,
}

#[derive(Clone, Debug)]
pub enum MigrationActionOverride {
    ResetDatabase,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "method", content = "params")]
pub enum RpcCall {
    GetDeployTarget,
    GetDeployData {
        typegraph: String,
    },
    #[serde(untagged)]
    TypegraphCall(TypegraphRpcCall),
}

struct ResetDatabase(PrismaRuntimeId);

impl FollowupOption<DeployAction> for ResetDatabase {
    fn add_to_options(&self, options: &mut DeployOptions) {
        options.filter.add_typegraph(self.0.typegraph.clone());
        options
            .migration_options
            .push((self.0.clone(), MigrationActionOverride::ResetDatabase));
    }
}

impl TaskAction for DeployAction {
    type SuccessData = DeploySuccess;
    type FailureData = DeployError;
    type Options = DeployOptions;
    type Generator = DeployActionGenerator;
    type RpcCall = RpcCall;

    async fn get_command(&self) -> Result<Command> {
        build_task_command(
            self.task_ref.path.clone(),
            self.shared_config.clone(),
            self.task_options.filter.clone(),
        )
        .await
    }

    fn get_options(&self) -> &Self::Options {
        &self.task_options
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

    async fn finalize(
        &self,
        res: &ActionResult<Self>,
        ctx: ActionFinalizeContext<Self>,
    ) -> Result<Option<Box<dyn FollowupOption<DeployAction>>>> {
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

                // TODO async
                self.unpack_migrations(&tg_name, &data.migrations, &ctx, &scope);

                match &data.failure {
                    Some(failure) => {
                        ctx.console.error(format!(
                            "{icon} error while deploying typegraph {name} from {path}",
                            icon = "✗".red(),
                            name = tg_name.cyan(),
                            path = self.task_ref.path.display().yellow(),
                        ));

                        let followup_option = self
                            .handle_push_failure(
                                &tg_name,
                                &self.task_ref.path,
                                failure,
                                &ctx,
                                &scope,
                            )
                            .await?;

                        Ok(followup_option.map(|opt| match opt.1 {
                            MigrationActionOverride::ResetDatabase => {
                                let res: Box<dyn FollowupOption<DeployAction>> =
                                    Box::new(ResetDatabase(PrismaRuntimeId {
                                        typegraph: tg_name,
                                        name: opt.0,
                                    }));
                                res
                            }
                        }))
                    }
                    None => {
                        ctx.console.info(format!(
                            "{icon} successfully deployed typegraph {name} from {path}",
                            icon = "✓".green(),
                            name = tg_name.cyan(),
                            path = self.task_ref.path.display().yellow(),
                        ));
                        Ok(None)
                    }
                }
            }

            Err(data) => {
                ctx.console.error(format!(
                    "{icon} failed to deploy typegraph {name} from {path}",
                    icon = "✗".red(),
                    name = data.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                ));
                for error in &data.errors {
                    ctx.console.error(format!("- {error}", error = error));
                }
                Ok(None)
            }
        }
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }

    async fn get_rpc_response(&self, call: RpcCall) -> Result<serde_json::Value> {
        match call {
            RpcCall::GetDeployTarget => {
                let deploy_target: &Node = &self.deploy_target;
                Ok(serde_json::to_value(deploy_target)?)
            }

            RpcCall::GetDeployData { typegraph } => Ok(self.get_deploy_data(&typegraph).await?),
            RpcCall::TypegraphCall(call) => Ok(call.dispatch()?),
        }
    }
}

impl MigrationAction {
    fn apply_override(self, action_override: &MigrationActionOverride) -> Self {
        match action_override {
            MigrationActionOverride::ResetDatabase => MigrationAction {
                reset: true,
                ..self
            },
        }
    }
}

impl DeployActionInner {
    async fn get_deploy_data(&self, typegraph: &str) -> Result<serde_json::Value> {
        let default_action = &self.shared_config.default_migration_action;
        let actions = self
            .task_options
            .migration_options
            .iter()
            .filter_map(|(rt, action_override)| {
                if rt.typegraph == typegraph {
                    Some((
                        rt.name.clone(),
                        default_action.clone().apply_override(action_override),
                    ))
                } else {
                    None
                }
            })
            .collect::<HashMap<_, _>>();

        Ok(serde_json::json!({
            "secrets": self.secrets.get(typegraph).await?,
            "defaultMigrationAction": default_action,
            "migrationActions": actions
        }))
    }
}
