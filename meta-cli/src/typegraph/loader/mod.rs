// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod discovery;
pub mod queue;
pub mod watch;

pub use discovery::Discovery;
use tokio::process::Command;

use std::{
    collections::HashMap,
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
};

use anyhow::{Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;

use crate::config::{Config, ModuleType};

use super::postprocess::{self, apply_all, PostProcessorWrapper};

pub type LoaderResult = Result<Vec<Typegraph>, LoaderError>;

#[derive(Clone)]
pub struct Loader {
    config: Arc<Config>,
    skip_deno_modules: bool,
    postprocessors: Vec<PostProcessorWrapper>,
}

impl Loader {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            skip_deno_modules: false,
            postprocessors: vec![
                postprocess::Validator.into(),
                postprocess::ReformatScripts.into(),
            ],
        }
    }

    pub fn skip_deno_modules(mut self, skip: bool) -> Self {
        self.skip_deno_modules = skip;
        self
    }

    pub fn with_postprocessor(mut self, postprocessor: impl Into<PostProcessorWrapper>) -> Self {
        self.postprocessors.push(postprocessor.into());
        self
    }

    pub async fn load_module(&self, path: &Path) -> LoaderResult {
        let command = Self::get_load_command(path.try_into().unwrap(), path);
        self.load_command(command, path).await
    }

    async fn load_command(&self, mut command: Command, path: &Path) -> LoaderResult {
        let p = command
            .current_dir(&self.config.base_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| LoaderError::LoaderProcess {
                path: path.to_owned(),
                error: e.into(),
            })?;

        if p.status.success() {
            #[cfg(debug_assertions)]
            eprintln!(
                "{}",
                std::str::from_utf8(&p.stderr).expect("invalid utf-8 on stderr")
            );

            std::str::from_utf8(&p.stdout)
                .with_context(|| "invalid utf-8 on stdout")
                .map_err(|e| LoaderError::Unknown {
                    error: e,
                    path: path.to_owned(),
                })?
                .lines()
                .map(|line| {
                    serde_json::from_str::<Typegraph>(line)
                        .map_err(|e| LoaderError::SerdeJson {
                            path: path.to_owned(),
                            content: line.to_string(),
                            error: e,
                        })
                        .and_then(|mut tg| {
                            tg.path = Some(path.to_owned());
                            apply_all(self.postprocessors.iter(), &mut tg, &self.config).map_err(
                                |e| LoaderError::PostProcessingError {
                                    path: path.to_owned(),
                                    typegraph_name: tg.name().unwrap(),
                                    error: e,
                                },
                            )?;
                            Ok(tg)
                        })
                })
                .collect()
        } else {
            Err(LoaderError::LoaderProcess {
                path: path.to_owned(),
                error: anyhow::anyhow!(
                    "{}",
                    String::from_utf8(p.stderr).map_err(|e| LoaderError::Unknown {
                        error: e.into(),
                        path: path.to_owned()
                    })?
                ),
            })
        }
    }

    fn get_load_command(module_type: ModuleType, path: &Path) -> Command {
        let vars: HashMap<_, _> = env::vars().collect();
        match module_type {
            ModuleType::Python => {
                let mut command = Command::new("python3");
                command
                    .arg(path.to_str().unwrap())
                    .envs(vars)
                    .env("PYTHONUNBUFFERED", "1")
                    .env("PYTHONDONTWRITEBYTECODE", "1")
                    .env("PY_TG_COMPATIBILITY", "1");
                command
            }
            ModuleType::Deno => {
                let mut command = Command::new("deno");
                command
                    .arg("run")
                    .arg("--unstable")
                    .arg("--allow-all")
                    .arg("--check")
                    .arg(path.to_str().unwrap())
                    .envs(vars);
                command
            }
        }
    }
}

#[derive(Debug)]
pub enum LoaderError {
    PostProcessingError {
        path: PathBuf,
        typegraph_name: String,
        error: Error,
    },
    SerdeJson {
        path: PathBuf,
        content: String,
        error: serde_json::Error,
    },
    LoaderProcess {
        path: PathBuf,
        error: Error,
    },
    Unknown {
        path: PathBuf,
        error: Error,
    },
}

impl ToString for LoaderError {
    fn to_string(&self) -> String {
        match self {
            Self::PostProcessingError {
                path,
                typegraph_name,
                error,
            } => {
                format!(
                    "error while post processing typegraph {name} from {path:?}: {error:?}",
                    name = typegraph_name.blue()
                )
            }
            Self::SerdeJson {
                path,
                content,
                error,
            } => {
                format!("error while parsing raw typegraph JSON from {path:?}: {error:?} in \"{content}\"")
            }
            Self::LoaderProcess { path, error } => {
                format!("error while loading typegraph(s) from {path:?}: {error:?}")
            }
            Self::Unknown { path, error } => {
                format!("error while loading typegraph(s) from {path:?}: {error:?}")
            }
        }
    }
}
