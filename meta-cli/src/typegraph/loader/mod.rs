// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod discovery;

pub use discovery::Discovery;
use tokio::{
    process::Command,
    sync::{Semaphore, SemaphorePermit},
};

use std::{
    borrow::BorrowMut,
    collections::HashMap,
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
};

use anyhow::{anyhow, Error, Result};
use colored::Colorize;

use crate::{
    com::{responses::SDKResponse, store::ServerStore},
    config::ModuleType,
    utils::ensure_venv,
};

#[derive(Debug, Clone)]
pub struct TypegraphInfos {
    pub path: PathBuf,
    pub base_path: PathBuf,
}

impl TypegraphInfos {
    pub fn get_response_or_fail(&self) -> Result<Arc<SDKResponse>> {
        ServerStore::get_response_or_fail(&self.path)
    }

    pub fn name(&self) -> Result<String> {
        let response = ServerStore::get_response_or_fail(&self.path)?;
        Ok(response.typegraph_name.clone())
    }

    pub fn get_key(&self) -> Result<String> {
        let path = self
            .path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("typegraph path is not valid unicode"))?;
        Ok(path.to_string())
    }
}

pub type LoaderResult = Result<TypegraphInfos, LoaderError>;

pub struct LoaderPool {
    base_dir: PathBuf,
    semaphore: Semaphore,
}

pub struct Loader<'a> {
    base_dir: PathBuf,
    #[allow(dead_code)]
    permit: SemaphorePermit<'a>,
}

impl LoaderPool {
    pub fn new(base_dir: PathBuf, max_parallel_loads: usize) -> Self {
        Self {
            base_dir,
            semaphore: Semaphore::new(max_parallel_loads),
        }
    }

    pub async fn get_loader(&self) -> Result<Loader<'_>> {
        Ok(Loader {
            base_dir: self.base_dir.clone(),
            permit: self.semaphore.acquire().await?,
        })
    }
}

impl<'a> Loader<'a> {
    pub async fn load_module(&self, path: Arc<PathBuf>) -> LoaderResult {
        match tokio::fs::try_exists(path.as_ref()).await {
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
        let command = Self::get_load_command(
            ModuleType::try_from(path.as_path()).unwrap(),
            &path,
            &self.base_dir,
        )
        .await?;
        self.load_command(command, &path).await
    }

    async fn load_command(&self, mut command: Command, path: &Path) -> LoaderResult {
        let path: Arc<PathBuf> = path.to_path_buf().into();
        let p = command
            .borrow_mut()
            .env("META_CLI_TG_PATH", path.display().to_string())
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
                    // TODO console actor
                    eprintln!(
                        "{}",
                        std::str::from_utf8(&p.stderr).expect("invalid utf-8 on stderr")
                    );
                }
            }
            Ok(TypegraphInfos {
                path: path.as_ref().to_owned(),
                base_path: self.base_dir.clone(),
            })
        } else {
            Err(LoaderError::LoaderProcess {
                path: path.clone(),
                error: anyhow::anyhow!(
                    "{}\n{}",
                    String::from_utf8(p.stderr).map_err(|e| LoaderError::Unknown {
                        error: e.into(),
                        path: path.clone(),
                    })?,
                    String::from_utf8(p.stdout).map_err(|e| LoaderError::Unknown {
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
        base_dir: &Path,
    ) -> Result<Command, LoaderError> {
        let vars: HashMap<_, _> = env::vars().collect();

        if let Ok(argv_str) = std::env::var("MCLI_LOADER_CMD") {
            let argv = argv_str.split(' ').collect::<Vec<_>>();
            let mut command = Command::new(argv[0]);
            command
                .args(&argv[1..])
                .arg(path.to_str().unwrap())
                .arg(base_dir)
                .envs(vars);
            return Ok(command);
        }

        match module_type {
            ModuleType::Python => {
                ensure_venv(path).map_err(|e| LoaderError::PythonVenvNotFound {
                    path: path.to_owned().into(),
                    error: e,
                })?;
                let vars: HashMap<_, _> = env::vars().collect();
                // TODO cache result?
                let mut command = Command::new("python3");
                command
                    .arg(path.to_str().unwrap())
                    .current_dir(base_dir)
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
                        path: path.to_path_buf().into(),
                        error,
                    })? {
                    TsLoaderRt::Deno => {
                        log::debug!("loading typegraph using deno");
                        let mut command = Command::new("deno");
                        command
                            .arg("run")
                            .arg("--unstable")
                            .arg("--allow-all")
                            .arg("--check")
                            .arg(path.to_str().unwrap())
                            .current_dir(base_dir)
                            .envs(vars);
                        Ok(command)
                    }
                    TsLoaderRt::Node => {
                        log::debug!("loading typegraph using npm x tsx, make sure npm packages have been installed");
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
                        log::debug!("loading typegraph using bun x tsx, make sure npm packages have been installed");
                        let mut command = Command::new("bun");
                        command
                            .arg("x")
                            .arg("tsx")
                            .arg(path.to_str().unwrap())
                            .current_dir(path.parent().unwrap())
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
        log::trace!("testing for ts project manifest in {parent_dir:?}");
        if matches!(try_exists(parent_dir.join("deno.json")).await, Ok(true))
            || matches!(try_exists(parent_dir.join("deno.jsonc")).await, Ok(true))
        {
            log::trace!("deno.json hit in {parent_dir:?}");
            return Ok(Deno);
        }
        if matches!(try_exists(parent_dir.join("package.json")).await, Ok(true)) {
            log::trace!("package.json hit in {parent_dir:?}");
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

#[allow(unused)]
#[derive(Debug)]
pub enum LoaderError {
    PostProcessingError {
        path: Arc<PathBuf>,
        typegraph_name: String,
        error: Error,
    },
    SerdeJson {
        path: Arc<PathBuf>,
        content: String,
        error: serde_json::Error,
    },
    LoaderProcess {
        path: Arc<PathBuf>,
        error: Error,
    },
    ModuleFileNotFound {
        path: Arc<PathBuf>,
    },
    Unknown {
        path: Arc<PathBuf>,
        error: Error,
    },
    PythonVenvNotFound {
        path: Arc<PathBuf>,
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
                format!("loader process error while loading typegraph(s) from {path:?}: {error:?}")
            }
            Self::Unknown { path, error } => {
                format!("unknown error while loading typegraph(s) from {path:?}: {error:?}")
            }
            Self::ModuleFileNotFound { path } => {
                format!("module file not found: {path:?}")
            }
            Self::PythonVenvNotFound { path, error } => {
                format!("python venv (.venv) not found in parent directories of {path:?}: {error}",)
            }
        }
    }
}
