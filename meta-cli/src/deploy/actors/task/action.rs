// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{command::CommandBuilder, TaskConfig};
use crate::interlude::*;
use common::typegraph::Typegraph;
use owo_colors::OwoColorize;
use serde::Deserialize;
use std::{path::Path, sync::Arc};
use tokio::{process::Command, sync::OwnedSemaphorePermit};

pub trait TaskActionGenerator: Clone {
    type Action: TaskAction;

    fn generate(&self, path: Arc<Path>, permit: OwnedSemaphorePermit) -> Self::Action;
}

pub trait TaskAction: std::fmt::Debug + Clone + Send + Unpin {
    type Output: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send;
    type Generator: TaskActionGenerator<Action = Self> + Unpin;

    async fn get_command(&self) -> Result<Command>;
    fn get_path(&self) -> &Path;
    fn get_path_owned(&self) -> Arc<Path>;

    fn get_start_message(&self) -> String;
    fn get_success_message(&self, res: &[Self::Output]) -> String;
    fn get_failure_message(&self, err: &str) -> String;
}

pub type SerializeAction = Arc<SerializeActionInner>;

#[derive(Debug)]
pub struct SerializeActionInner {
    path: Arc<Path>,
    task_config: Arc<TaskConfig>,
    #[allow(unused)]
    permit: OwnedSemaphorePermit,
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

    fn generate(&self, path: Arc<Path>, permit: OwnedSemaphorePermit) -> Self::Action {
        SerializeActionInner {
            path,
            task_config: self.task_config.clone(),
            permit,
        }
        .into()
    }
}

impl TaskAction for SerializeAction {
    type Output = Typegraph;
    type Generator = SerializeActionGenerator;

    async fn get_command(&self) -> Result<Command> {
        CommandBuilder {
            path: self.path.clone(),
            task_config: self.task_config.clone(),
            action_env: "serialize",
        }
        .build()
        .await
    }

    fn get_path(&self) -> &Path {
        return &self.path;
    }

    fn get_path_owned(&self) -> Arc<Path> {
        return self.path.clone();
    }

    fn get_start_message(&self) -> String {
        format!("starting serialization process for {:?}", self.path)
    }

    fn get_success_message(&self, res: &[Self::Output]) -> String {
        let names = res
            .iter()
            .map(|tg| format!("{}", tg.name().unwrap_or_log().yellow()))
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "{icon} successful serialization from {path:?}: {names}",
            icon = "✓".green(),
            path = self.path,
        )
    }

    fn get_failure_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to serialize {path:?}: {err}",
            icon = "✗".red(),
            path = self.path,
            err = err
        )
    }
}

pub type DeployAction = Arc<DeployActionInner>;

#[derive(Debug)]
pub struct DeployActionInner {
    path: Arc<Path>,
    task_config: Arc<TaskConfig>,
    #[allow(unused)]
    permit: OwnedSemaphorePermit,
}

#[derive(Clone)]
pub struct DeployActionGenerator {
    task_config: Arc<TaskConfig>,
}

impl DeployActionGenerator {
    pub fn new(task_config: TaskConfig) -> Self {
        Self {
            task_config: Arc::new(task_config),
        }
    }
}

impl TaskActionGenerator for DeployActionGenerator {
    type Action = DeployAction;

    fn generate(&self, path: Arc<Path>, permit: OwnedSemaphorePermit) -> Self::Action {
        DeployActionInner {
            path,
            task_config: self.task_config.clone(),
            permit,
        }
        .into()
    }
}

#[derive(Deserialize, Debug)]
pub struct DeployOutput {
    deployed: String,
}

impl TaskAction for DeployAction {
    type Output = DeployOutput;
    type Generator = DeployActionGenerator;

    async fn get_command(&self) -> Result<Command> {
        CommandBuilder {
            path: self.path.clone(),
            task_config: self.task_config.clone(),
            action_env: "deploy",
        }
        .build()
        .await
    }

    fn get_path(&self) -> &Path {
        return &self.path;
    }

    fn get_path_owned(&self) -> Arc<Path> {
        return self.path.clone();
    }

    fn get_start_message(&self) -> String {
        format!("starting deployment process for {:?}", self.path)
    }

    fn get_success_message(&self, res: &[Self::Output]) -> String {
        let deployed = res
            .iter()
            .map(|output| format!("{}", output.deployed.yellow()))
            .collect::<Vec<_>>()
            .join(", ");
        format!(
            "{icon} successful deployment from {path:?}: {deployed}",
            icon = "✓".green(),
            path = self.path,
            deployed = deployed
        )
    }

    fn get_failure_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to deploy {path:?}: {err}",
            icon = "✗".red(),
            path = self.path,
            err = err
        )
    }
}
