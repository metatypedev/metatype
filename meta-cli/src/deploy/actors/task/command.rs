// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::TaskConfig;
use crate::interlude::*;
use crate::{config::ModuleType, typegraph::loader::get_task_command};
use std::process::Stdio;
use std::{path::Path, sync::Arc};
use tokio::process::Command;

pub(super) struct CommandBuilder {
    pub path: PathBuf,
    pub task_config: Arc<TaskConfig>,
    pub action_env: &'static str,
}

impl CommandBuilder {
    pub(super) async fn build(&self) -> Result<Command> {
        if !tokio::fs::try_exists(&self.path)
            .await
            .map_err(|e| eyre::eyre!("typegraph file {:?} does not exist: {:#}", self.path, e))?
        {
            return Err(eyre::eyre!(
                "typegraph file {:?} does not exist",
                &self.path
            ));
        }

        let path: &Path = &self.path;
        // TODO move into this file
        let mut command = get_task_command(
            ModuleType::try_from(path).unwrap_or_log(),
            path,
            &self.task_config.base_dir,
        )
        .await
        .map_err(|e| eyre::eyre!("failed to get task command: {:#}", e))?;
        command
            .env("MCLI_TG_PATH", path.display().to_string())
            .env(
                "MCLI_SERVER_PORT",
                self.task_config.instance_port.to_string(),
            )
            .env("MCLI_ACTION", self.action_env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        Ok(command)
    }
}
