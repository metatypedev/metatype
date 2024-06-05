// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::TaskActor;
use crate::deploy::actors::task_manager::TaskManager;
use crate::interlude::*;
use crate::{config::Config, deploy::actors::console::ConsoleActor};
use std::{path::Path, sync::Arc};
use tokio::{process::Command, sync::OwnedSemaphorePermit};

pub trait TaskActionGenerator: Clone {
    type Action: TaskAction;

    fn generate(
        &self,
        path: Arc<Path>,
        followup: Option<<Self::Action as TaskAction>::Followup>,
        permit: OwnedSemaphorePermit,
    ) -> Self::Action;
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

pub trait FollowupTaskConfig<A: TaskAction> {
    fn schedule(&self, task_manager: Addr<TaskManager<A>>);
}

pub trait TaskAction: std::fmt::Debug + Clone + Send + Unpin {
    type SuccessData: OutputData;
    type FailureData: OutputData;
    type Followup: FollowupTaskConfig<Self> + Default + std::fmt::Debug + Unpin + Send;
    type Generator: TaskActionGenerator<Action = Self> + Unpin;

    async fn get_command(&self) -> Result<Command>;
    fn get_path(&self) -> &Path;
    fn get_path_owned(&self) -> Arc<Path>;

    fn get_start_message(&self) -> String;
    fn get_error_message(&self, err: &str) -> String;

    fn get_global_config(&self) -> serde_json::Value;
    fn get_typegraph_config(&self, typegraph: &str) -> serde_json::Value;

    fn finalize(&self, res: &ActionResult<Self>, ctx: ActionFinalizeContext<Self>);
}

pub type ActionResult<A: TaskAction> = Result<A::SuccessData, A::FailureData>;

pub fn get_typegraph_name<A: TaskAction>(res: &ActionResult<A>) -> String {
    match res {
        Ok(success) => success.get_typegraph_name(),
        Err(failure) => failure.get_typegraph_name(),
    }
}
