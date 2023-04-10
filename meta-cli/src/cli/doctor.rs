// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::path::PathBuf;

use crate::{
    config::{METATYPE_FILES, PIPFILE_FILES, PYPROJECT_FILES, REQUIREMENTS_FILES, VENV_FOLDERS},
    fs::{clean_path, find_in_parents},
};

use super::{Action, GenArgs};
use anyhow::{Ok, Result};
use async_trait::async_trait;
use clap::Parser;
use common::get_version;

#[derive(Parser, Debug)]
pub struct Doctor {}

fn str_or_not_found(dir: &PathBuf, path: &Option<PathBuf>) -> Result<String> {
    let str = match path {
        Some(p) => clean_path(dir, p)?,
        None => "not found".to_string(),
    };
    Ok(str)
}

#[async_trait]
impl Action for Doctor {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;
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
