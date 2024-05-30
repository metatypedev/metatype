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

pub trait OutputData: serde::de::DeserializeOwned + std::fmt::Debug + Unpin + Send {
    fn get_typegraph_name(&self) -> String;
}

pub trait TaskAction: std::fmt::Debug + Clone + Send + Unpin {
    type SuccessData: OutputData;
    type FailureData: OutputData;
    type Generator: TaskActionGenerator<Action = Self> + Unpin;

    async fn get_command(&self) -> Result<Command>;
    fn get_path(&self) -> &Path;
    fn get_path_owned(&self) -> Arc<Path>;

    fn get_start_message(&self) -> String;
    fn get_success_message(&self, output: &Self::SuccessData) -> String;
    fn get_failure_message(&self, output: &Self::FailureData) -> String;
    fn get_error_message(&self, err: &str) -> String;
}

pub type ActionResult<A: TaskAction> = Result<A::SuccessData, A::FailureData>;

pub fn get_typegraph_name<A: TaskAction>(res: &ActionResult<A>) -> String {
    match res {
        Ok(success) => success.get_typegraph_name(),
        Err(failure) => failure.get_typegraph_name(),
    }
}

pub use deploy::*;
pub use serialize::*;

mod serialize {
    use super::*;

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

    #[derive(Deserialize, Debug)]
    pub struct SerializeError {
        typegraph: String,
        error: String,
    }

    impl OutputData for Typegraph {
        fn get_typegraph_name(&self) -> String {
            self.name().unwrap()
        }
    }

    impl OutputData for SerializeError {
        fn get_typegraph_name(&self) -> String {
            self.typegraph.clone()
        }
    }

    impl TaskAction for SerializeAction {
        type SuccessData = Typegraph;
        type FailureData = SerializeError;
        type Generator = SerializeActionGenerator;

        async fn get_command(&self) -> Result<Command> {
            CommandBuilder {
                path: self.task_config.base_dir.to_path_buf().join(&self.path),
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

        fn get_success_message(&self, output: &Self::SuccessData) -> String {
            format!(
                "{icon} successfully serialized typegraph {name} from {path:?}",
                icon = "✓".green(),
                name = output.get_typegraph_name().cyan(),
                path = self.path,
            )
        }

        fn get_failure_message(&self, output: &Self::FailureData) -> String {
            format!(
                "{icon} failed to serialize typegraph {name} from {path:?}: {err}",
                icon = "✗".red(),
                name = output.get_typegraph_name().cyan(),
                path = self.path,
                err = output.error,
            )
        }

        fn get_error_message(&self, err: &str) -> String {
            format!(
                "{icon} failed to serialize typegraph(s) from {path:?}: {err}",
                icon = "✗".red(),
                path = self.path,
                err = err,
            )
        }
    }
}

mod deploy {
    use super::*;
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
    pub struct DeploySuccess {
        typegraph: String,
    }

    #[derive(Deserialize, Debug)]
    pub struct DeployError {
        typegraph: String,
        error: String,
        #[serde(default)]
        follow_up: Option<String>, // todo migration
    }

    impl OutputData for DeploySuccess {
        fn get_typegraph_name(&self) -> String {
            self.typegraph.clone()
        }
    }

    impl OutputData for DeployError {
        fn get_typegraph_name(&self) -> String {
            self.typegraph.clone()
        }
    }

    impl TaskAction for DeployAction {
        type SuccessData = DeploySuccess;
        type FailureData = DeployError;
        type Generator = DeployActionGenerator;

        async fn get_command(&self) -> Result<Command> {
            CommandBuilder {
                path: self.task_config.base_dir.to_path_buf().join(&self.path),
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

        fn get_success_message(&self, output: &Self::SuccessData) -> String {
            format!(
                "{icon} successfully deployed typegraph {name} from {path:?}",
                icon = "✓".green(),
                name = output.get_typegraph_name().cyan(),
                path = self.path,
            )
        }

        fn get_failure_message(&self, output: &Self::FailureData) -> String {
            format!(
                "{icon} failed to deploy typegraph {name} from {path:?}: {err}",
                icon = "✗".red(),
                name = output.get_typegraph_name().cyan(),
                path = self.path,
                err = output.error,
            )
        }

        fn get_error_message(&self, err: &str) -> String {
            format!(
                "{icon} failed to deploy typegraph(s) from {path:?}: {err}",
                icon = "✗".red(),
                path = self.path,
                err = err,
            )
        }
    }
}
