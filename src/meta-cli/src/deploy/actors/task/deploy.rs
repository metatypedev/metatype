// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod artifacts;
mod migrations;

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupOption, OutputData, RpcResponse,
    SharedActionConfig, TaskAction, TaskActionGenerator, TaskFilter,
};
use super::command::build_task_command;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::{self, TaskRef};
use crate::interlude::*;
use crate::secrets::Secrets;
use crate::typegraph::rpc::{RpcCall as TypegraphRpcCall, RpcDispatch};
use artifacts::ArtifactUploader;
use base64::prelude::*;
use color_eyre::owo_colors::OwoColorize;
use common::node::Node;
use reqwest::header::{self, HeaderMap, HeaderValue};
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

impl MigrationActionOverride {
    pub fn apply(&self, migration_action: MigrationAction) -> MigrationAction {
        match self {
            Self::ResetDatabase => MigrationAction {
                reset: true,
                ..migration_action
            },
        }
    }
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

struct ResetDatabase(PrismaRuntimeId);

impl FollowupOption<DeployAction> for ResetDatabase {
    fn add_to_options(&self, options: &mut DeployOptions) {
        options.filter.add_typegraph(self.0.typegraph.clone());
        options
            .migration_options
            .push((self.0.clone(), MigrationActionOverride::ResetDatabase));
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum RpcRequest {
    Deploy(DeployParams),
    #[serde(untagged)]
    Typegraph(TypegraphRpcCall),
}

impl TaskAction for DeployAction {
    type SuccessData = DeploySuccess;
    type FailureData = DeployError;
    type Options = DeployOptions;
    type Generator = DeployActionGenerator;
    type RpcRequest = RpcRequest;

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

                let messages = &data
                    .errors
                    .iter()
                    .map(|err| format!("- {err}"))
                    .collect::<Vec<_>>();

                ctx.console.error(messages.join("\n"));

                Ok(None)
            }
        }
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }

    async fn handle_rpc_request(
        &self,
        call: Self::RpcRequest,
    ) -> Result<RpcResponse<Self::SuccessData, Self::FailureData>> {
        match call {
            RpcRequest::Deploy(params) => Ok(RpcResponse::TaskResult(self.deploy(params).await)),
            RpcRequest::Typegraph(method) => Ok(RpcResponse::Value(method.dispatch()?)),
        }
    }
}

impl DeployActionInner {
    async fn deploy(&self, params: DeployParams) -> Result<DeploySuccess, DeployError> {
        let deploy_data = self
            .get_deploy_data(&params.typegraph_name)
            .map_err(|err| DeployError {
                typegraph: params.typegraph_name.clone(),
                errors: vec![err.to_string()],
            })
            .await?;

        let (typgraph, artifacts) = Lib::serialize_typegraph(SerializeParams {
            typegraph_name: params.typegraph_name.clone(),
            typegraph_path: params.typegraph_path.clone(),
            prefix: params.prefix.clone(),
            artifact_resolution: true,
            codegen: false,
            prisma_migration: PrismaMigrationConfig {
                migrations_dir: params.migration_dir.clone(),
                migration_actions: deploy_data.migration_actions,
                default_migration_action: deploy_data.default_migration_action,
            },
            pretty: false,
        })
        .map_err(|error| DeployError {
            typegraph: params.typegraph_path.clone(),
            errors: error.stack,
        })?;

        self.request_typegate(params, typgraph, artifacts, deploy_data.secrets)
            .await
    }

    async fn request_typegate(
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

        let mut base_headers = HeaderMap::new();

        base_headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );

        if let Some(auth) = basic_auth.as_ref() {
            base_headers.insert(
                header::AUTHORIZATION,
                HeaderValue::from_str(auth).map_err(|error| DeployError {
                    typegraph: params.typegraph_name.clone(),
                    errors: vec![error.to_string()],
                })?,
            );
        }

        if !artifacts.is_empty() {
            let artifact_uploader = ArtifactUploader {
                client: &client,
                base_url: self.deploy_target.base_url.clone(),
                base_header: base_headers.clone(),
                typegraph_name: params.typegraph_name.clone(),
                typegraph_path: params.typegraph_path.clone(),
            };

            artifact_uploader
                .upload_artifacts(&artifacts)
                .map_err(|error| DeployError {
                    typegraph: params.typegraph_name.clone(),
                    errors: vec![error.to_string()],
                })
                .await?;
        } else {
            log::debug!("no artifacts to upload");
        }

        let response = client
            .post(url)
            .headers(base_headers)
            .body(body)
            .send()
            .map_err(|error| DeployError {
                typegraph: params.typegraph_name.clone(),
                errors: vec![error.to_string()],
            })
            .await?;

        let response: DeployResponse = response
            .json()
            .map_err(|error| DeployError {
                typegraph: params.typegraph_name.clone(),
                errors: vec![error.to_string()],
            })
            .await?;

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
                        action_override.apply(default_action.clone()),
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
