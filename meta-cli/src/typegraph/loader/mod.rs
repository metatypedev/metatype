// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod discovery;

pub use discovery::Discovery;
use pathdiff::diff_paths;
use tokio::process::Command;

use std::{collections::HashMap, env, path::Path, process::Stdio, sync::Arc};

use anyhow::{anyhow, Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;

use crate::{
    config::{Config, ModuleType},
    utils::ensure_venv,
};

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

    pub async fn load_module(&self, path: Arc<Path>) -> LoaderResult {
        match tokio::fs::try_exists(&path).await {
            Ok(exists) => {
                if !exists {
                    return Err(LoaderError::ModuleFileNotFound { path });
                }
            }
            Err(e) => {
                return Err(LoaderError::Unknown {
                    path,
                    error: anyhow!("failed to check if file exists: {}", e.to_string()),
                });
            }
        }
        let command = Self::get_load_command(ModuleType::try_from(&*path).unwrap(), &path).await?;
        self.load_command(command, &path).await
    }

    async fn load_command(&self, mut command: Command, path: &Path) -> LoaderResult {
        // TODO: use env var to pass a tmp tpath for the cmd to emit it to
        // openssl::sha::sha256(path.to_str())
        // std::env::temp_dir().join(path);
        let path: Arc<Path> = path.into();
        let p = command
            .current_dir(&self.config.base_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| LoaderError::LoaderProcess {
                path: path.clone(),
                error: e.into(),
            })?;

        if p.status.success() {
            #[cfg(debug_assertions)]
            {
                if !p.stderr.is_empty() {
                    eprintln!(
                        "{}",
                        std::str::from_utf8(&p.stderr).expect("invalid utf-8 on stderr")
                    );
                }
            }
            let base_path = &self.config.base_dir;

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
                            tg.path = Some(path.clone());
                            apply_all(self.postprocessors.iter(), &mut tg, &self.config).map_err(
                                |e| {
                                    let path = diff_paths(&path, base_path.clone()).unwrap();
                                    LoaderError::PostProcessingError {
                                        path: path.into(),
                                        typegraph_name: tg.name().unwrap(),
                                        error: e,
                                    }
                                },
                            )?;
                            Ok(tg)
                        })
                })
                .collect()
        } else {
            Err(LoaderError::LoaderProcess {
                path: path.clone(),
                error: anyhow::anyhow!(
                    "{}",
                    String::from_utf8(p.stderr).map_err(|e| LoaderError::Unknown {
                        error: e.into(),
                        path,
                    })?
                ),
            })
        }
    }

    async fn get_load_command(
        module_type: ModuleType,
        path: &Path,
    ) -> Result<Command, LoaderError> {
        let vars: HashMap<_, _> = env::vars().collect();
        if let Ok(argv_str) = std::env::var("MCLI_LOADER_CMD") {
            let argv = argv_str.split(' ').collect::<Vec<_>>();
            let mut command = Command::new(argv[0]);
            command
                .args(&argv[1..])
                .arg(path.to_str().unwrap())
                .envs(vars);
            return Ok(command);
        }
        match module_type {
            ModuleType::Python => {
                // TODO cache result?
                ensure_venv(path).map_err(|e| LoaderError::PythonVenvNotFound {
                    path: path.to_owned().into(),
                    error: e,
                })?;
                let vars: HashMap<_, _> = env::vars().collect();
                let mut command = Command::new("python3");
                command
                    .arg(path.to_str().unwrap())
                    .envs(vars)
                    .env("PYTHONUNBUFFERED", "1")
                    .env("PYTHONDONTWRITEBYTECODE", "1")
                    .env("PY_TG_COMPATIBILITY", "1");
                Ok(command)
            }
            ModuleType::Deno => {
                // TODO cache result?
                match detect_deno_loader_cmd(path)
                    .await
                    .map_err(|error| LoaderError::Unknown {
                        path: path.into(),
                        error,
                    })? {
                    TsLoaderRt::Deno => {
                        let mut command = Command::new("deno");
                        command
                            .arg("run")
                            .arg("--unstable")
                            .arg("--allow-all")
                            .arg("--check")
                            .arg(path.to_str().unwrap())
                            .envs(vars);
                        Ok(command)
                    }
                    TsLoaderRt::Node => {
                        log::debug!("loading typegraph using node, make sure npm packages have been installed");
                        let mut command = Command::new("npm");
                        command
                            .arg("x")
                            .arg("tsx")
                            .current_dir(path.parent().unwrap())
                            .arg(path.to_str().unwrap())
                            .envs(vars);
                        Ok(command)
                    }
                    TsLoaderRt::Bun => {
                        log::debug!("loading typegraph using bun, make sure npm packages have been installed");
                        let mut command = Command::new("bun");
                        command
                            .arg("x")
                            .arg("tsx")
                            .current_dir(path.parent().unwrap())
                            .arg(path.to_str().unwrap())
                            .envs(vars);
                        Ok(command)
                    }
                }
            }
        }
    }
}

enum TsLoaderRt {
    Deno,
    Node,
    Bun,
}
async fn detect_deno_loader_cmd(tg_path: &Path) -> Result<TsLoaderRt> {
    use TsLoaderRt::*;
    let test_deno_exec = || async {
        Command::new("deno")
            .arg("--version")
            .output()
            .await
            .map(|out| out.status.success())
            .map_err(|err| anyhow!(err))
    };
    let test_node_exec = || async {
        Command::new("node")
            .arg("-v")
            .output()
            .await
            .map(|out| out.status.success())
            .map_err(|err| anyhow!(err))
    };
    let test_bun_exec = || async {
        Command::new("deno")
            .arg("--version")
            .output()
            .await
            .map(|out| out.status.success())
            .map_err(|err| anyhow!(err))
    };
    let mut maybe_parent_dir = tg_path.parent();
    // try to detect runtime in use by checking for package.json/deno.json
    // files first
    loop {
        let Some(parent_dir) = maybe_parent_dir else {
            break;
        };
        use tokio::fs::try_exists;
        if try_exists(parent_dir.join("deno.json")).await.is_ok()
            || try_exists(parent_dir.join("deno.jsonc")).await.is_ok()
        {
            return Ok(Deno);
        }
        if try_exists(parent_dir.join("package.json")).await.is_ok() {
            // TODO: cache the test values without making a spaghetti mess
            // lazy async result values are hard to Once/LazyCell :/
            if test_node_exec().await? {
                return Ok(Node);
            }
            if test_bun_exec().await? {
                return Ok(Bun);
            }
        }
        maybe_parent_dir = parent_dir.parent();
    }
    // if no package manifest found, just use the first runtime found in the
    // following order
    if test_deno_exec().await? {
        return Ok(Deno);
    }
    if test_node_exec().await? {
        return Ok(Node);
    }
    if test_bun_exec().await? {
        return Ok(Bun);
    }
    Err(anyhow::format_err!(
        "unable to find deno, node or bun runtimes"
    ))
}

#[derive(Debug)]
pub enum LoaderError {
    PostProcessingError {
        path: Arc<Path>,
        typegraph_name: String,
        error: Error,
    },
    SerdeJson {
        path: Arc<Path>,
        content: String,
        error: serde_json::Error,
    },
    LoaderProcess {
        path: Arc<Path>,
        error: Error,
    },
    ModuleFileNotFound {
        path: Arc<Path>,
    },
    Unknown {
        path: Arc<Path>,
        error: Error,
    },
    PythonVenvNotFound {
        path: Arc<Path>,
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
            Self::ModuleFileNotFound { path } => {
                format!("module file not found: {path:?}")
            }
            Self::PythonVenvNotFound { path, error } => {
                format!(
                    "python venv (.venv) not found in parent directories of {path:?}: {error:?}"
                )
            }
        }
    }
}
