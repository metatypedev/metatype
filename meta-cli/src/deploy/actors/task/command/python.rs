// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::shell_words;
use tokio::process::Command;

use crate::{interlude::*, utils::ensure_venv};

pub(super) async fn get_raw_command(path: impl AsRef<Path>) -> Result<Command> {
    ensure_venv(path.as_ref()).map_err(|e| {
        eyre::eyre!(
            "python venv (.venv) not found in parent directories of {:?}: {}",
            path.as_ref(),
            e
        )
    })?;
    let loader_py = std::env::var("MCLI_LOADER_PY").unwrap_or_else(|_| "python3".to_string());
    let loader_py = shell_words::split(&loader_py).unwrap();
    let mut command = Command::new(loader_py[0].clone());
    command
        .args(&loader_py[1..])
        .arg(path.as_ref().to_str().unwrap())
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .env("PY_TG_COMPATIBILITY", "1");
    Ok(command)
}
