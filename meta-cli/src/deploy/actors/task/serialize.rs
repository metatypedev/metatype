// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupTaskConfig, OutputData, TaskAction,
    TaskActionGenerator,
};
use super::command::CommandBuilder;
use super::TaskConfig;
use crate::com::store::MigrationAction;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::{TaskManager, TaskRef};
use crate::interlude::*;
use color_eyre::owo_colors::OwoColorize;
use common::typegraph::Typegraph;
use serde::Deserialize;
use std::sync::Arc;
use tokio::process::Command;

pub type SerializeAction = Arc<SerializeActionInner>;

#[derive(Debug)]
pub struct SerializeActionInner {
    task_ref: TaskRef,
    task_config: Arc<TaskConfig>,
}

#[derive(Clone)]
pub struct SerializeActionGenerator {
    task_config: Arc<TaskConfig>,
}

impl SerializeActionGenerator {
    pub fn new(task_config: TaskConfig) -> Self {
        Self {
            task_config: Arc::new(task_config),
        }
    }
}

impl TaskActionGenerator for SerializeActionGenerator {
    type Action = SerializeAction;

    fn generate(&self, task_ref: TaskRef, followup: Option<()>) -> Self::Action {
        SerializeActionInner {
            task_ref,
            task_config: self.task_config.clone(),
        }
        .into()
    }
}

#[derive(Deserialize, Debug)]
pub struct SerializeError {
    pub typegraph: String,
    pub error: String,
}

impl OutputData for Box<Typegraph> {
    fn get_typegraph_name(&self) -> String {
        self.name().unwrap()
    }
}

impl OutputData for SerializeError {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
}

impl FollowupTaskConfig<SerializeAction> for () {
    fn schedule(&self, _task_manager: Addr<TaskManager<Arc<SerializeActionInner>>>) {}
}

impl TaskAction for SerializeAction {
    type SuccessData = Box<Typegraph>;
    type FailureData = SerializeError;
    type Generator = SerializeActionGenerator;
    type Followup = ();

    async fn get_command(&self) -> Result<Command> {
        CommandBuilder {
            path: self
                .task_config
                .base_dir
                .to_path_buf()
                .join(&self.task_ref.path),
            task_config: self.task_config.clone(),
            action_env: "serialize",
        }
        .build()
        .await
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

    fn finalize(&self, res: &ActionResult<Self>, ctx: ActionFinalizeContext<Self>) {
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
                    "{icon} failed to serialize typegraph {name} from {path}: {err}",
                    icon = "✗".red(),
                    name = output.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                    err = output.error,
                ));
            }
        }
    }

    fn get_global_config(&self) -> serde_json::Value {
        serde_json::json!({
            "typegate": None::<String>,
            "prefix": None::<String>,
        })
    }
    fn get_typegraph_config(&self, typegraph: &str) -> serde_json::Value {
        serde_json::json!({
            "secrets": {},
            "artifactResolution": true, // TODO??
            "migrationActions": {},
            "defaultMigrationAction": MigrationAction::default(),
            "migrationsDir": ".", // TODO
        })
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }
}
