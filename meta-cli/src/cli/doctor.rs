// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{
    cmp::{self},
    path::PathBuf,
};

use crate::{
    config::{METATYPE_FILES, PIPFILE_FILES, PYPROJECT_FILES, REQUIREMENTS_FILES, VENV_FOLDERS},
    fs::{clean_path, find_in_parents},
    global_config::GlobalConfig,
};

use super::{Action, GenArgs};
use anyhow::{Ok, Result};
use async_trait::async_trait;
use clap::Parser;
use common::get_version;
use terminal_size::terminal_size;

#[derive(Parser, Debug)]
pub struct Doctor {}

fn str_or_not_found(dir: &PathBuf, path: &Option<PathBuf>) -> Result<String> {
    let str = match path {
        Some(p) => clean_path(dir, p)?,
        None => "not found".to_string(),
    };
    Ok(str)
}

fn print_box(title: &str, content: &str, target_width: usize) {
    let width = cmp::min(
        target_width,
        terminal_size().map(|(w, _)| w.0).unwrap_or(80) as usize,
    );
    let wrap_width = width - 4;
    println!("┌{}┐", "-".repeat(width - 2));
    println!("| {} {}|", title, " ".repeat(wrap_width - title.len()),);
    for line in textwrap::wrap(content.trim(), wrap_width - 2) {
        println!("| > {} {}|", line, " ".repeat(wrap_width - 2 - line.len()),);
    }
    println!("└{}┘", "-".repeat(width - 2));
}

#[async_trait]
impl Action for Doctor {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;
        println!("Current directory: {}", dir.display());
        println!("Global config: {}", GlobalConfig::default_path()?.display());

        /*
        - docker-compose
        - container running
        - typegate targets reacheable
        - secrets access
        - runtime healtcheck
        - gitignore ignore correct folder
        */

        println!("————— SDKs ——————\n");

        print_box("SDKs", "Python", 40);

        let version_cli = get_version();
        let metatype_file = find_in_parents(dir, METATYPE_FILES)?;
        let venv_folder = find_in_parents(dir, VENV_FOLDERS)?;
        let pyproject_file = find_in_parents(dir, PYPROJECT_FILES)?;
        let pipfile_file = find_in_parents(dir, PIPFILE_FILES)?;
        let requirements_file = find_in_parents(dir, REQUIREMENTS_FILES)?;

        println!("Metatype file: {}", str_or_not_found(dir, &metatype_file)?);
        println!("venv folder: {}", str_or_not_found(dir, &venv_folder)?);
        println!(
            "pyproject file: {}",
            str_or_not_found(dir, &pyproject_file)?
        );
        println!("pipfile file: {}", str_or_not_found(dir, &pipfile_file)?);
        println!(
            "requirements file: {}",
            str_or_not_found(dir, &requirements_file)?
        );
        println!("Meta CLI version: {version_cli}");
        Ok(())
    }
}
