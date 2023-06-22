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

#[derive(Clone)]
pub struct Loader {
    config: Arc<Config>,
    skip_deno_modules: bool,
    postprocessors: Vec<PostProcessorWrapper>,
}

pub enum LoaderResult {
    Loaded(Vec<Typegraph>),
    #[cfg_attr(feature = "typegraph-next", allow(dead_code))]
    Rewritten(PathBuf),
    Error(LoaderError),
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

    #[cfg(not(feature = "typegraph-next"))]
    pub async fn load_file(&self, path: &Path) -> LoaderResult {
        // we passed through the filters, so we can unwrap safely
        let res = match ModuleType::try_from(path).unwrap() {
            ModuleType::Python => self.load_python_module(path).await,
            ModuleType::Deno => self.load_deno_module(path).await,
        };
        match res {
            Ok(json) if json.is_empty() => LoaderResult::Rewritten(path.to_path_buf()),
            Ok(json) => match self.load_string(path, json) {
                Err(err) => LoaderResult::Error(err),
                Ok(tgs) => LoaderResult::Loaded(tgs),
            },
            Err(err) => LoaderResult::Error(LoaderError::Unknown {
                path: path.to_owned(),
                error: err,
            }),
        }
    }

    #[cfg(feature = "typegraph-next")]
    pub async fn load_file(&self, path: &Path) -> LoaderResult {
        let command = Self::get_load_command(path.try_into().unwrap(), path);
        match self.load_command(command, path).await {
            Ok(tgs) => LoaderResult::Loaded(tgs),
            Err(e) => LoaderResult::Error(e),
        }
    }

    #[cfg(feature = "typegraph-next")]
    async fn load_command(
        &self,
        mut command: Command,
        path: &Path,
    ) -> Result<Vec<Typegraph>, LoaderError> {
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

    #[cfg(not(feature = "typegraph-next"))]
    fn load_string(&self, path: &Path, json: String) -> Result<Vec<Typegraph>, LoaderError> {
        let mut tgs =
            serde_json::from_str::<Vec<Typegraph>>(&json).map_err(|e| LoaderError::SerdeJson {
                path: path.to_owned(),
                error: e,
            })?;
        for tg in tgs.iter_mut() {
            tg.path = Some(path.to_owned());
            apply_all(self.postprocessors.iter(), tg, &self.config).map_err(|e| {
                LoaderError::PostProcessingError {
                    path: path.to_owned(),
                    typegraph_name: tg.name().unwrap(),
                    error: e,
                }
            })?;
        }
        Ok(tgs)
    }

    #[cfg(not(feature = "typegraph-next"))]
    pub async fn load_python_module(&self, path: &Path) -> Result<String> {
        // Search in PATH does not work on Windows
        // See: https://doc.rust-lang.org/std/process/struct.Command.html#method.new
        #[cfg(target_os = "windows")]
        let program_name = Path::new(&env::var("VIRTUAL_ENV")?).join("Scripts/py-tg.exe");
        #[cfg(not(target_os = "windows"))]
        let program_name = Path::new("py-tg").to_path_buf();

        let vars: HashMap<_, _> = env::vars().collect();

        let p = Command::new(program_name.clone())
            .arg(path.to_str().unwrap())
            // .args(args)
            .current_dir(&self.config.base_dir)
            .envs(vars)
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if self.skip_deno_modules { "1" } else { "" },
            )
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .with_context(|| format!("Running the command '{:?} {:?}'", program_name, path))?;

        if p.status.success() {
            Ok(String::from_utf8(p.stdout)?)
        } else {
            let stderr = String::from_utf8(p.stderr)?;
            anyhow::bail!("Python error:\n{}", stderr.red())
        }
    }

    #[cfg(not(feature = "typegraph-next"))]
    pub async fn load_deno_module(&self, _path: &Path) -> Result<String> {
        anyhow::bail!("deno modules not supported yet")
    }

    #[cfg(feature = "typegraph-next")]
    fn get_load_command(module_type: ModuleType, path: &Path) -> Command {
        let vars: HashMap<_, _> = env::vars().collect();
        match module_type {
            ModuleType::Python => {
                let mut command = Command::new("python3");
                command
                    .arg(path.to_str().unwrap())
                    .envs(vars)
                    .env("PYTHONUNBUFFERED", "1")
                    .env("PYTHONDONTWRITEBYTECODE", "1");
                command
            }
            ModuleType::Deno => {
                let mut command = Command::new("deno");
                command
                    .arg("run")
                    .arg("--allow-read")
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
        error: serde_json::Error,
    },
    #[cfg_attr(not(feature = "typegraph-next"), allow(dead_code))]
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
                    "Error while post processing typegraph {name} from {path:?}: {error:?}",
                    name = typegraph_name.blue()
                )
            }
            Self::SerdeJson { path, error } => {
                format!("Error while parsing raw typegraph JSON from {path:?}: {error:?}")
            }
            Self::LoaderProcess { path, error } => {
                format!("Error while loading typegraph(s) from {path:?}: {error:?}")
            }
            Self::Unknown { path, error } => {
                format!("Error while loading typegraph(s) from {path:?}: {error:?}")
            }
        }
    }
}
