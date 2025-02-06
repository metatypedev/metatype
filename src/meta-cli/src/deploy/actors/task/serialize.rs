// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupOption, OutputData, RpcResponse,
    SharedActionConfig, TaskAction, TaskActionGenerator, TaskFilter,
};
use super::command::build_task_command;
use super::deploy::MigrationAction;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::TaskRef;
use crate::interlude::*;
use crate::typegraph::rpc::{RpcCall as TypegraphRpcCall, RpcDispatch};
use color_eyre::owo_colors::OwoColorize;
use serde::Deserialize;
use std::sync::Arc;
use tg_schema::Typegraph;
use tokio::process::Command;
use typegraph_core::sdk::core::{Handler, SerializeParams};
use typegraph_core::Lib;

pub type SerializeAction = Arc<SerializeActionInner>;

#[derive(Debug)]
pub struct SerializeActionInner {
    task_ref: TaskRef,
    task_options: SerializeOptions,
    shared_config: Arc<SharedActionConfig>,
}

#[derive(Clone)]
pub struct SerializeActionGenerator {
    shared_config: Arc<SharedActionConfig>,
}

impl SerializeActionGenerator {
    pub fn new(
        prefix: Option<String>,
        config_dir: Arc<Path>,
        working_dir: Arc<Path>,
        migrations_dir: Arc<Path>,
        artifact_resolution: bool,
    ) -> Self {
        Self {
            shared_config: SharedActionConfig {
                command: "serialize",
                prefix,
                config_dir,
                working_dir,
                migrations_dir,
                default_migration_action: MigrationAction {
                    apply: true,
                    create: false,
                    reset: false,
                },
                artifact_resolution,
            }
            .into(),
        }
    }
}

impl TaskActionGenerator for SerializeActionGenerator {
    type Action = SerializeAction;

    fn generate(&self, task_ref: TaskRef, task_options: SerializeOptions) -> Self::Action {
        SerializeActionInner {
            task_ref,
            task_options,
            shared_config: self.shared_config.clone(),
        }
        .into()
    }

    fn get_shared_config(&self) -> Arc<SharedActionConfig> {
        self.shared_config.clone()
    }
}

#[derive(Deserialize, Debug)]
pub struct SerializeError {
    pub typegraph: String,
    pub errors: Vec<String>,
}

impl OutputData for Arc<Typegraph> {
    fn get_typegraph_name(&self) -> String {
        self.name().unwrap()
    }
    fn is_success(&self) -> bool {
        true
    }
}

#[derive(Debug, Default)]
pub struct SerializeOptions {
    filter: TaskFilter,
}

impl OutputData for SerializeError {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
    fn is_success(&self) -> bool {
        false
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum RpcRequest {
    Serialize(SerializeParams),
    #[serde(untagged)]
    Typegraph(TypegraphRpcCall),
}

impl TaskAction for SerializeAction {
    type SuccessData = Arc<Typegraph>;
    type FailureData = SerializeError;
    type Options = SerializeOptions;
    type Generator = SerializeActionGenerator;
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
            "starting serialization process for {:?}",
            self.task_ref.path.display().yellow()
        )
    }

    fn get_error_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to serialize typegraph(s) from {path:?}: {err}",
            icon = "✗".red(),
            path = self.task_ref.path.display().yellow(),
            err = err,
        )
    }

    async fn finalize(
        &self,
        res: &ActionResult<Self>,
        ctx: ActionFinalizeContext<Self>,
    ) -> Result<Option<Box<dyn FollowupOption<SerializeAction>>>> {
        match res {
            Ok(data) => {
                ctx.console.info(format!(
                    "{icon} successfully serialized typegraph {name} from {path}",
                    icon = "✓".green(),
                    name = data.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                ));
            }
            Err(output) => {
                ctx.console.error(format!(
                    "{icon} failed to serialize typegraph {name} from {path}",
                    icon = "✗".red(),
                    name = output.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                ));

                let messages = output
                    .errors
                    .iter()
                    .map(|err| format!("- {err}"))
                    .collect::<Vec<_>>();

                ctx.console.error(messages.join("\n"));
            }
        }

        Ok(None)
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }

    async fn handle_rpc_request(
        &self,
        call: Self::RpcRequest,
    ) -> Result<RpcResponse<Self::SuccessData, Self::FailureData>> {
        match call {
            RpcRequest::Serialize(params) => Ok(RpcResponse::TaskResult(self.serialize(params))),
            RpcRequest::Typegraph(method) => Ok(RpcResponse::Value(method.dispatch()?)),
        }
    }
}

impl SerializeActionInner {
    fn serialize(&self, params: SerializeParams) -> Result<Arc<Typegraph>, SerializeError> {
        let typegraph_name = params.typegraph_name.clone();
        match Lib::serialize_typegraph(params) {
            Ok((value, _)) => {
                Ok(serde_json::from_str(&value).expect("Failed to deserialize JSON typegraph"))
            }
            Err(error) => Err(SerializeError {
                typegraph: typegraph_name,
                errors: error.stack,
            }),
        }
    }
}
