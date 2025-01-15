// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod migrations;

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupOption, OutputData, SharedActionConfig,
    TaskAction, TaskActionGenerator, TaskFilter,
};
use super::command::build_task_command;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::{self, TaskRef};
use crate::interlude::*;
use crate::secrets::Secrets;
use crate::typegraph::rpc::{RpcCall as TypegraphRpcCall, RpcDispatch};
use base64::prelude::*;
use color_eyre::owo_colors::OwoColorize;
use common::node::Node;
use reqwest::Client;
use serde::Deserialize;
use std::{path::Path, sync::Arc};
use tokio::process::Command;
use typegraph_core::sdk::core::{Artifact, Handler as _, PrismaMigrationConfig, SerializeParams};
use typegraph_core::sdk::utils::{Handler as _, QueryDeployParams};
use typegraph_core::Lib;

pub use typegraph_core::sdk::core::MigrationAction;

pub type DeployAction = Arc<DeployActionInner>;

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
        default_migration_action: MigrationAction,
    ) -> Self {
        Self {
            secrets,
            shared_config: SharedActionConfig {
                command: "deploy",
                prefix: node.prefix.clone(),
                config_dir,
                working_dir,
                migrations_dir,
                default_migration_action,
                artifact_resolution: true,
            }
            .into(),
            node,
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

#[derive(Deserialize, Debug, Clone)]
pub struct TypegraphData {
    pub name: String,
    pub path: PathBuf,
    pub artifacts: Vec<Artifact>,
}

#[derive(Deserialize, Debug)]
pub struct DeploySuccess {
    pub typegraph: TypegraphData,
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
        self.typegraph.name.clone()
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
pub struct DeployData {
    pub secrets: HashMap<String, String>,
    pub default_migration_action: MigrationAction,
    pub migration_actions: Vec<(String, MigrationAction)>,
}

#[derive(Deserialize, Debug)]
pub struct DeployParams {
    pub typegraph_name: String,
    pub typegraph_path: String,
    pub prefix: Option<String>,
    pub migration_dir: String,
}

#[derive(Deserialize, Debug)]
#[serde(untagged)]
enum DeployResponse {
    Success { data: DeploySuccessData },
    Error { errors: Vec<DeployErrorData> },
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct DeploySuccessData {
    add_typegraph: DeployTypegraphData,
}

#[derive(Deserialize, Debug)]
struct DeployTypegraphData {
    name: String,
    messages: Vec<MessageEntry>,
    migrations: Vec<Migration>,
    failure: Option<String>,
}

#[derive(Deserialize, Debug)]
struct DeployErrorData {
    message: String,
}

#[derive(Deserialize, Debug)]
pub struct DeployCommand {
    pub params: DeployParams,
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
    type RpcRequest = TypegraphRpcCall;
    type RpcCommand = DeployCommand;

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
                        ctx.task_manager
                            .do_send(task_manager::message::TypegraphDeployed(
                                data.typegraph.clone(),
                            ));
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

    async fn handle_rpc_request(&self, call: Self::RpcRequest) -> Result<serde_json::Value> {
        Ok(call.dispatch()?)
    }

    async fn handle_rpc_command(
        &self,
        call: Self::RpcCommand,
    ) -> Result<Self::SuccessData, Self::FailureData> {
        let deploy_data = self
            .get_deploy_data(&call.params.typegraph_name)
            .await
            .map_err(|err| DeployError {
                typegraph: call.params.typegraph_name.clone(),
                errors: vec![err.to_string()],
            })?;

        let (typgraph, artifacts) = Lib::serialize_typegraph(SerializeParams {
            typegraph_name: call.params.typegraph_name.clone(),
            typegraph_path: call.params.typegraph_path.clone(),
            prefix: call.params.prefix.clone(),
            artifact_resolution: true,
            codegen: false,
            prisma_migration: PrismaMigrationConfig {
                migrations_dir: call.params.migration_dir.clone(),
                migration_actions: deploy_data.migration_actions,
                default_migration_action: deploy_data.default_migration_action,
            },
            pretty: false,
        })
        .map_err(|error| DeployError {
            typegraph: call.params.typegraph_path.clone(),
            errors: error.stack,
        })?;

        self.tg_deploy(call.params, typgraph, artifacts, deploy_data.secrets)
            .await
    }
}

fn apply_override(
    migration_action: MigrationAction,
    action_override: &MigrationActionOverride,
) -> MigrationAction {
    match action_override {
        MigrationActionOverride::ResetDatabase => MigrationAction {
            reset: true,
            ..migration_action
        },
    }
}

impl DeployActionInner {
    async fn tg_deploy(
        &self,
        params: DeployParams,
        typegraph: String,
        artifacts: Vec<Artifact>,
        secrets: HashMap<String, String>,
    ) -> Result<DeploySuccess, DeployError> {
        let client = Client::new();

        let basic_auth = self.deploy_target.auth.as_ref().map(|auth| {
            let credentials = format!("{}:{}", auth.username, auth.password);
            let encoded = BASE64_STANDARD.encode(credentials);
            format!("Basic {}", encoded)
        });
        let url = self.deploy_target.base_url.join("/typegate").unwrap();
        let body = Lib::gql_deploy_query(QueryDeployParams {
            tg: typegraph,
            secrets: Some(secrets.into_iter().collect()),
        })
        .map_err(|error| DeployError {
            typegraph: params.typegraph_name.clone(),
            errors: error.stack,
        })?;

        let mut request = client
            .post(url)
            .header("Content-type", "application/json")
            .body(body);

        if let Some(auth) = basic_auth.as_ref() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.map_err(|error| DeployError {
            typegraph: params.typegraph_name.clone(),
            errors: vec![error.to_string()],
        })?;

        let response: DeployResponse = response.json().await.map_err(|error| DeployError {
            typegraph: params.typegraph_name.clone(),
            errors: vec![error.to_string()],
        })?;

        match response {
            DeployResponse::Success { data } => Ok(DeploySuccess {
                typegraph: TypegraphData {
                    name: data.add_typegraph.name,
                    path: params.typegraph_path.into(),
                    artifacts,
                },
                messages: data.add_typegraph.messages,
                migrations: data.add_typegraph.migrations,
                failure: data.add_typegraph.failure,
            }),
            DeployResponse::Error { errors } => Err(DeployError {
                typegraph: params.typegraph_name,
                errors: errors.into_iter().map(|v| v.message).collect(),
            }),
        }
    }

    async fn get_deploy_data(&self, typegraph: &str) -> Result<DeployData> {
        let default_action = &self.shared_config.default_migration_action;
        let actions = self
            .task_options
            .migration_options
            .iter()
            .filter_map(|(rt, action_override)| {
                if rt.typegraph == typegraph {
                    Some((
                        rt.name.clone(),
                        apply_override(default_action.clone(), action_override),
                    ))
                } else {
                    None
                }
            })
            .collect();

        Ok(DeployData {
            secrets: self.secrets.get(typegraph).await?,
            default_migration_action: default_action.clone(),
            migration_actions: actions,
        })
    }
}
