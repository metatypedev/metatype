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
    pub prefix: Option<String>,
    pub config_dir: Arc<Path>,
    pub working_dir: Arc<Path>,
    pub migrations_dir: Arc<Path>,
    pub default_migration_action: MigrationAction,
    pub artifact_resolution: bool,
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

#[derive(Clone)]
pub struct ActionFinalizeContext<A: TaskAction + 'static> {
    pub config: Arc<Config>,
    pub task_manager: Addr<TaskManager<A>>,
    pub task: Addr<TaskActor<A>>,
    pub console: Addr<ConsoleActor>,
}

pub trait OutputData: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send {
    fn get_typegraph_name(&self) -> String;
    fn is_success(&self) -> bool;
}

#[derive(Default, Debug, Clone)]
pub enum TaskFilter {
    #[default]
    All,
    Typegraphs(Vec<String>),
}

impl TaskFilter {
    pub fn add_typegraph(&mut self, name: String) {
        match self {
            TaskFilter::All => {
                *self = TaskFilter::Typegraphs(vec![name]);
            }
            TaskFilter::Typegraphs(typegraphs) => {
                if !typegraphs.contains(&name) {
                    typegraphs.push(name);
                }
            }
        }
    }
}

impl core::fmt::Display for TaskFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskFilter::All => write!(f, "all"),
            TaskFilter::Typegraphs(typegraphs) => write!(f, "typegraphs={}", typegraphs.join(",")),
        }
    }
}

pub trait FollowupOption<A: TaskAction> {
    fn add_to_options(&self, options: &mut A::Options);
}

pub trait TaskAction: std::fmt::Debug + Clone + Send + Unpin {
    type SuccessData: OutputData;
    type FailureData: OutputData;
    type Options: Default + std::fmt::Debug + Unpin + Send;
    type Generator: TaskActionGenerator<Action = Self> + Unpin;
    type RpcCall: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send;

    fn get_command(&self) -> impl Future<Output = Result<Command>>;
    fn get_task_ref(&self) -> &TaskRef;

    fn get_options(&self) -> &Self::Options;

    fn get_start_message(&self) -> String;
    fn get_error_message(&self, err: &str) -> String;

    /// returns followup task options
    fn finalize(
        &self,
        res: &Result<Self::SuccessData, Self::FailureData>,
        ctx: ActionFinalizeContext<Self>,
    ) -> impl Future<Output = Result<Option<Box<dyn FollowupOption<Self>>>>>;

    fn get_rpc_response(
        &self,
        call: &Self::RpcCall,
    ) -> impl Future<Output = Result<serde_json::Value>>;
}

pub type ActionResult<A> = Result<<A as TaskAction>::SuccessData, <A as TaskAction>::FailureData>;

pub fn get_typegraph_name<A: TaskAction>(res: &ActionResult<A>) -> String {
    match res {
        Ok(success) => success.get_typegraph_name(),
        Err(failure) => failure.get_typegraph_name(),
    }
}
