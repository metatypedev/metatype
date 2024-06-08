// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::deploy::MigrationAction;
use super::TaskActor;
use crate::deploy::actors::task_manager::{TaskManager, TaskRef};
use crate::interlude::*;
use crate::{config::Config, deploy::actors::console::ConsoleActor};
use std::sync::Arc;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct SharedActionConfig {
    pub command: &'static str,
    pub config_dir: Arc<Path>,
    pub working_dir: Arc<Path>,
    pub migrations_dir: Arc<Path>,
    pub default_migration_action: MigrationAction,
}

pub trait TaskActionGenerator: Clone {
    type Action: TaskAction;

    fn generate(
        &self,
        task_ref: TaskRef,
        options: <Self::Action as TaskAction>::Options,
    ) -> Self::Action;

    fn get_shared_config(&self) -> Arc<SharedActionConfig>;
}

pub struct ActionFinalizeContext<A: TaskAction + 'static> {
    pub config: Arc<Config>,
    pub task_manager: Addr<TaskManager<A>>,
    pub task: Addr<TaskActor<A>>,
    pub console: Addr<ConsoleActor>,
}

pub trait OutputData: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send {
    fn get_typegraph_name(&self) -> String;
}

#[derive(Default, Debug, Clone)]
pub enum TaskFilter {
    #[default]
    All,
    Typegraphs(Vec<String>),
}

impl ToString for TaskFilter {
    fn to_string(&self) -> String {
        match self {
            TaskFilter::All => "all".to_string(),
            TaskFilter::Typegraphs(typegraphs) => format!("typegraphs={}", typegraphs.join(",")),
        }
    }
}

pub trait TaskAction: std::fmt::Debug + Clone + Send + Unpin {
    type SuccessData: OutputData;
    type FailureData: OutputData;
    type Options: Default + std::fmt::Debug + Unpin + Send;
    type Generator: TaskActionGenerator<Action = Self> + Unpin;
    type RpcCall: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send;

    async fn get_command(&self) -> Result<Command>;
    fn get_task_ref(&self) -> &TaskRef;

    fn get_options(&self) -> &Self::Options;

    fn get_start_message(&self) -> String;
    fn get_error_message(&self, err: &str) -> String;

    fn finalize(&self, res: &ActionResult<Self>, ctx: ActionFinalizeContext<Self>);

    async fn get_rpc_response(&self, call: &Self::RpcCall) -> Result<serde_json::Value>;
}

pub type ActionResult<A: TaskAction> = Result<A::SuccessData, A::FailureData>;

pub fn get_typegraph_name<A: TaskAction>(res: &ActionResult<A>) -> String {
    match res {
        Ok(success) => success.get_typegraph_name(),
        Err(failure) => failure.get_typegraph_name(),
    }
}
