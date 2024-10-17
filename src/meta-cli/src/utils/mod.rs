// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod clap;
pub mod shell_words;

use crate::interlude::*;

use dialoguer::{Input, Password};
use std::env::{set_var, var};

use crate::config::VENV_FOLDERS;
use crate::fs::find_in_parents;
use common::node::BasicAuth as BasicAuthCommon;

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    if let Ok(active_venv) = var("VIRTUAL_ENV") {
        let active_venv = Path::new(&active_venv);
        trace!("Detected active venv at {active_venv:?}.");
        if active_venv.is_dir() {
            return Ok(());
        }
        bail!("Active venv at {active_venv:?} not found.");
    }

    if let Some(venv_dir) = find_in_parents(dir, VENV_FOLDERS)? {
        let path = var("PATH")?;

        // https://github.com/pypa/virtualenv/commit/993ba1316a83b760370f5a3872b3f5ef4dd904c1
        #[cfg(target_os = "windows")]
        let path = format!(
            "{venv_bin};{path}",
            venv_bin = venv_dir.as_path().join("Scripts").to_str().unwrap()
        );
        #[cfg(not(target_os = "windows"))]
        let path = format!(
            "{venv_bin}:{path}",
            venv_bin = venv_dir.as_path().join("bin").to_str().unwrap()
        );

        unsafe { set_var("VIRTUAL_ENV", venv_dir.to_str().unwrap()) };
        unsafe { set_var("PATH", path) };
        Ok(())
    } else {
        bail!("Python venv required")
    }
}

#[derive(Debug, Clone)]
pub struct BasicAuth {
    pub username: String,
    pub password: String,
}

impl BasicAuth {
    pub fn new(username: String, password: String) -> Self {
        Self { username, password }
    }

    pub fn prompt() -> Result<Self> {
        let username = Input::new().with_prompt("Username").interact_text()?;
        let password = Password::new().with_prompt("Password").interact()?;
        Ok(Self { username, password })
    }

    pub fn prompt_as_user(username: String) -> Result<Self> {
        let password = Password::new()
            .with_prompt(format!("Password for user {username}"))
            .interact()?;
        Ok(Self { username, password })
    }
}

impl From<BasicAuth> for BasicAuthCommon {
    fn from(val: BasicAuth) -> Self {
        BasicAuthCommon {
            username: val.username,
            password: val.password,
        }
    }
}
