use super::action::{
    ActionFinalizeContext, ActionResult, OutputData, TaskAction, TaskActionGenerator,
};
use super::command::CommandBuilder;
use super::TaskConfig;
use crate::deploy::actors::console::Console;
use crate::deploy::push::pusher::{MessageEntry, Migrations};
use crate::interlude::*;
use color_eyre::owo_colors::OwoColorize;
use serde::Deserialize;
use std::{path::Path, sync::Arc};
use tokio::{process::Command, sync::OwnedSemaphorePermit};

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
    pub typegraph: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migrations>,
    pub failure: Option<String>,
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

    fn get_error_message(&self, err: &str) -> String {
        format!(
            "{icon} failed to deploy typegraph(s) from {path:?}: {err}",
            icon = "✗".red(),
            path = self.path,
            err = err,
        )
    }

    fn finalize(&self, res: &ActionResult<Self>, ctx: ActionFinalizeContext<Self>) {
        match res {
            Ok(data) => {
                let scope = format!("({path})", path = self.path.display());
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

                let migdir = ctx.config.prisma_migration_dir_abs(&data.typegraph);
                for migrations in data.migrations.iter() {
                    let dest = migdir.join(&migrations.runtime);
                    if let Err(err) =
                        common::archive::unpack(&dest, Some(migrations.migrations.clone()))
                    {
                        ctx.console.error(format!(
                            "error while unpacking migrations into {:?}",
                            migdir
                        ));
                        ctx.console.error(format!("{err:?}"));
                    } else {
                        ctx.console.info(format!(
                            "{scope} unpacked migrations for {}/{} at {}",
                            tg_name.cyan(),
                            migrations.runtime,
                            dest.display().bold()
                        ));
                    }
                }

                match data.failure {
                    Some(_) => {
                        todo!();
                    }
                    None => {
                        ctx.console.info(format!(
                            "{icon} successfully deployed typegraph {name} from {path}",
                            icon = "✓".green(),
                            name = tg_name.cyan(),
                            path = self.path.display().yellow(),
                        ));
                    }
                }
            }

            Err(data) => {
                ctx.console.error(format!(
                    "{icon} failed to deploy typegraph {name} from {path:?}: {err}",
                    icon = "✗".red(),
                    name = data.get_typegraph_name().cyan(),
                    path = self.path,
                    err = data.error,
                ));
            }
        }
    }
}
