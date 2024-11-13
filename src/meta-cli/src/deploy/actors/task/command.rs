// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::ModuleType;
use crate::interlude::*;
use crate::utils::shell_words;
use std::process::Stdio;
use std::{path::Path, sync::Arc};
use tokio::process::Command;

use super::action::{SharedActionConfig, TaskFilter};

mod python;
mod typescript;

pub(super) async fn build_task_command(
    relative_path: impl AsRef<Path>,
    shared_config: Arc<SharedActionConfig>,
    task_filter: TaskFilter,
) -> Result<Command> {
    let path = shared_config.working_dir.join(relative_path.as_ref());
    let ctx = CommandContext {
        shared_config,
        task_filter,
        path,
    };

    ctx.ensure_file_exists().await?;

    let mut command = if let Ok(command) = ctx.build_raw_from_env() {
        command
    } else {
        match ModuleType::try_from(ctx.path.as_path())? {
            ModuleType::Python => python::get_raw_command(&ctx.path).await?,
            ModuleType::TypeScript | ModuleType::JavaScript => {
                typescript::get_raw_command(&ctx.path).await?
            }
        }
    };

    ctx.setup_task(&mut command);

    Ok(command)
}

struct CommandContext {
    shared_config: Arc<SharedActionConfig>,
    task_filter: TaskFilter,
    path: PathBuf,
}

impl CommandContext {
    async fn ensure_file_exists(&self) -> Result<()> {
        if !tokio::fs::try_exists(&self.path).await.map_err(|e| {
            eyre::eyre!(
                "typegraph definition module {:?} does not exist: {:#}",
                self.path,
                e
            )
        })? {
            return Err(eyre::eyre!(
                "typegraph definition module {:?} does not exist",
                &self.path
            ));
        }
        Ok(())
    }

    fn build_raw_from_env(&self) -> Result<Command> {
        let argv_str = std::env::var("MCLI_LOADER_CMD")?;
        let argv_str_fmtd = argv_str
            .replace("{filepath}", self.path.to_str().unwrap())
            .replace(
                "{cwd}",
                &std::env::current_dir()
                    .map(|c| c.to_string_lossy().to_string())
                    .unwrap_or("{cwd}".to_string()),
            )
            .to_string();
        let command = if !argv_str_fmtd.eq(&argv_str) {
            // custom
            let argv = shell_words::split(&argv_str_fmtd).map_err(|err| anyhow::anyhow!(err))?;
            let mut command = Command::new(argv[0].clone());
            command.args(&argv[1..]);
            command
        } else {
            // prefix the path
            let argv = shell_words::split(&argv_str).map_err(|err| anyhow::anyhow!(err))?;
            let mut command = Command::new(argv[0].clone());
            command.args(&argv[1..]).arg(self.path.to_str().unwrap());
            command
        };
        Ok(command)
    }

    fn setup_task(&self, command: &mut Command) {
        let CommandContext {
            shared_config,
            task_filter,
            path,
        } = self;

        let optional_envs = [("MCLI_PREFIX", shared_config.prefix.clone())];

        command
            .current_dir(shared_config.working_dir.to_str().unwrap())
            .env("MCLI_VERSION", crate::build::PKG_VERSION)
            .env("MCLI_TYPEGRAPH_PATH", path.display().to_string())
            .env("MCLI_COMMAND", shared_config.command)
            .env("MCLI_FILTER", task_filter.to_string())
            .env(
                "MCLI_CONFIG_DIR",
                shared_config.config_dir.display().to_string(),
            )
            .env(
                "MCLI_WORKING_DIR",
                shared_config.working_dir.display().to_string(),
            )
            .env(
                "MCLI_MIGRATIONS_DIR",
                shared_config.migrations_dir.display().to_string(),
            )
            .env(
                "MCLI_ARTIFACT_RESOLUTION",
                shared_config.artifact_resolution.to_string(),
            )
            .envs(
                optional_envs
                    .into_iter()
                    .filter_map(|(k, v)| v.map(|v| (k, v))),
            )
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
    }
}
