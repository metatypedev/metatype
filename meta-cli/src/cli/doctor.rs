// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{path::PathBuf, sync::Arc};

use crate::{
    cli::ui,
    config::{Config, PIPFILE_FILES, PYPROJECT_FILES, REQUIREMENTS_FILES, VENV_FOLDERS},
    fs::{clean_path, find_in_parents},
    global_config::GlobalConfig,
    typegraph::loader::Discovery,
};

use super::{Action, GenArgs};
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use colored::Colorize;
use common::get_version;
use std::process::Command;

#[derive(Parser, Debug)]
pub struct Doctor {}

fn str_or_ko(dir: &PathBuf, path: &Option<PathBuf>) -> Result<String> {
    let str = match path {
        Some(p) => clean_path(dir, p)?,
        None => "not found".to_string(),
    };
    Ok(str)
}

fn shell(cmds: Vec<&str>) -> Result<String> {
    let output = Command::new(cmds[0]).args(&cmds[1..]).output()?;
    let ret = String::from_utf8(output.stdout).unwrap().trim().to_string();
    Ok(ret)
}

#[async_trait]
impl Action for Doctor {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;

        let w = 60;
        let c = 20;

        ui::title("Global", w);
        ui::cols(c, "curr. directory", &dir.display().to_string());
        ui::cols(
            c,
            "global config",
            &GlobalConfig::default_path()?.display().to_string(),
        );
        ui::cols(c, "meta-cli version", get_version());
        match shell(vec!["docker", "--version"]) {
            Ok(s) => {
                ui::cols(c, "docker version", &s);
                let containers = shell(vec![
                    "docker",
                    "container",
                    "ls",
                    "--format",
                    "{{.Image}} ({{.Status}})",
                ])?;
                let containers = containers
                    .split('\n')
                    .map(|l| l.trim())
                    .filter(|l| !l.is_empty())
                    .collect::<Vec<&str>>()
                    .join(", ");
                ui::cols(
                    20,
                    "containers",
                    if containers.is_empty() {
                        "none"
                    } else {
                        &containers
                    },
                );
            }
            Err(_) => {
                ui::cols(c, "docker version", "none");
            }
        }
        println!();

        let config = Config::load_or_find(args.config.clone(), dir);

        ui::title("Project", w);
        match config {
            Ok(config) => {
                ui::cols(c, "metatype file", &str_or_ko(dir, &config.path)?);

                let targets = config
                    .typegates
                    .clone()
                    .into_iter()
                    .map(|(target, info)| {
                        let url = info.url.to_string();
                        let kind = if url.contains("//localhost") || url.contains("//127.0.0.1") {
                            "local"
                        } else if url.contains("metatype.cloud") {
                            "cloud"
                        } else {
                            "remote"
                        };

                        format!(
                            "{}{} ({}, {} secrets)",
                            info.prefix.unwrap_or("".to_string()).italic(),
                            target,
                            kind,
                            info.env.len()
                        )
                    })
                    .collect::<Vec<_>>();

                let base_dir = config.base_dir.clone();
                let tgs = Discovery::new(Arc::new(config), base_dir)
                    .get_all(true)
                    .await?
                    .into_iter()
                    .map(|p| clean_path(dir, p).unwrap_or("".to_string()))
                    .collect::<Vec<_>>();

                ui::cols(
                    c,
                    "targets",
                    &format!("[{}] {}", targets.len(), targets.join(", ")),
                );
                ui::cols(
                    c,
                    "typegraphs",
                    &format!("[{}] {}", tgs.len(), tgs.join(", ")),
                );
            }
            Err(e) => {
                ui::cols(c, "metatype file", &e.to_string());
            }
        }

        println!();
        let python_version = shell(vec!["python", "--version"]).ok();
        let deno_version = shell(vec!["deno", "-V"]).ok();
        let node_version = shell(vec!["node", "--version"]).ok();

        ui::title("Python SDK", w);
        if let Some(v) = python_version {
            let venv_folder = find_in_parents(dir, VENV_FOLDERS)?;
            let pyproject_file = find_in_parents(dir, PYPROJECT_FILES)?;
            let pipfile_file = find_in_parents(dir, PIPFILE_FILES)?;
            let requirements_file = find_in_parents(dir, REQUIREMENTS_FILES)?;

            ui::cols(c, "python version", &v);
            ui::cols(
                c,
                "python bin",
                &clean_path(dir, shell(vec!["which", "python"])?)?,
            );
            ui::cols(c, "venv folder", &str_or_ko(dir, &venv_folder)?);
            ui::cols(c, "pyproject file", &str_or_ko(dir, &pyproject_file)?);
            ui::cols(c, "pipfile file", &str_or_ko(dir, &pipfile_file)?);
            ui::cols(c, "requirements file", &str_or_ko(dir, &requirements_file)?);
            ui::cols(
                c,
                "typegraph version",
                &shell(vec![
                    "python",
                    "-c",
                    "import typegraph; print(typegraph.version)",
                ])?,
            );
        } else {
            ui::cols(c, "python version", "not installed");
        }

        println!();
        ui::title("Typescript SDK", w);
        if let Some(v) = deno_version {
            ui::cols(c, "deno version", &v);
        } else {
            ui::cols(c, "deno version", "none");
        }
        if let Some(v) = node_version {
            ui::cols(c, "node version", &v);
        } else {
            ui::cols(c, "node version", "none");
        }

        println!();
        ui::print_box(
            "In case of issue or question, please raise a ticket on:\nhttps://github.com/metatypedev/metatype/issues\nOr browse the documentation:\nhttps://metatype.dev/docs",
            w + 2,
        );
        Ok(())
    }
}
