// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::action::{
    ActionFinalizeContext, ActionResult, FollowupOption, OutputData, SharedActionConfig,
    TaskAction, TaskActionGenerator, TaskFilter,
};
use super::command::build_task_command;
use super::deploy::MigrationAction;
use crate::deploy::actors::console::Console;
use crate::deploy::actors::task_manager::TaskRef;
use crate::interlude::*;
use color_eyre::owo_colors::OwoColorize;
use serde::Deserialize;
use std::sync::Arc;
use tokio::process::Command;

pub type ListAction = Arc<ListActionInner>;

#[derive(Debug)]
pub struct ListActionInner {
    task_ref: TaskRef,
    task_options: ListOptions,
    shared_config: Arc<SharedActionConfig>,
}

#[derive(Clone)]
pub struct ListActionGenerator {
    shared_config: Arc<SharedActionConfig>,
}

impl ListActionGenerator {
    pub fn new(
        config_dir: Arc<Path>,
        working_dir: Arc<Path>,
        migrations_dir: Arc<Path>,
        artifact_resolution: bool,
    ) -> Self {
        Self {
            shared_config: SharedActionConfig {
                command: "list",
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

impl TaskActionGenerator for ListActionGenerator {
    type Action = ListAction;

    fn generate(&self, task_ref: TaskRef, task_options: ListOptions) -> Self::Action {
        ListActionInner {
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
pub struct ListSuccess {
    pub typegraph: String,
}

impl OutputData for ListSuccess {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
    fn is_success(&self) -> bool {
        true
    }
}

#[derive(Deserialize, Debug)]
pub struct ListError {
    pub typegraph: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Default)]
pub struct ListOptions {
    filter: TaskFilter,
}

impl OutputData for ListError {
    fn get_typegraph_name(&self) -> String {
        self.typegraph.clone()
    }
    fn is_success(&self) -> bool {
        false
    }
}

impl TaskAction for ListAction {
    type SuccessData = ListSuccess;
    type FailureData = ListError;
    type Options = ListOptions;
    type Generator = ListActionGenerator;
    type RpcCall = serde_json::Value;

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
            "starting list process for {:?}",
            self.task_ref.path.display().yellow()
        )
    }

    fn get_error_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to list typegraph(s) from {path:?}: {err}",
            icon = "✗".red(),
            path = self.task_ref.path.display().yellow(),
            err = err,
        )
    }

    async fn finalize(
        &self,
        res: &ActionResult<Self>,
        ctx: ActionFinalizeContext<Self>,
    ) -> Result<Option<Box<dyn FollowupOption<ListAction>>>> {
        match res {
            Ok(data) => {
                ctx.console.info(format!(
                    "{icon} successfully listed typegraph {name} from {path}",
                    icon = "✓".green(),
                    name = data.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                ));
            }
            Err(output) => {
                ctx.console.error(format!(
                    "{icon} failed to list typegraph {name} from {path}",
                    icon = "✗".red(),
                    name = output.get_typegraph_name().cyan(),
                    path = self.task_ref.path.display().yellow(),
                ));
                for err in output.errors.iter() {
                    ctx.console.error(format!("- {err}"));
                }
            }
        }

        Ok(None)
    }

    fn get_task_ref(&self) -> &crate::deploy::actors::task_manager::TaskRef {
        &self.task_ref
    }

    async fn get_rpc_response(&self, _call: &serde_json::Value) -> Result<serde_json::Value> {
        Err(ferr!("rpc request not supported on list task"))
    }
}
