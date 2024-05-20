// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;
use eyre::Error;

pub mod discovery;

pub use discovery::Discovery;
use owo_colors::OwoColorize;
use tokio::{
    io::AsyncReadExt,
    process::Command,
    sync::{Semaphore, SemaphorePermit},
    time::{timeout, Duration},
};

use crate::{
    com::{responses::SDKResponse, server::get_instance_port, store::ServerStore},
    config::ModuleType,
    utils::ensure_venv,
};

#[derive(Debug, Clone)]
pub struct TypegraphInfos {
    pub path: PathBuf,
    pub base_path: PathBuf,
}

impl TypegraphInfos {
    pub fn get_responses_or_fail(&self) -> Result<Arc<HashMap<String, SDKResponse>>> {
        ServerStore::get_responses_or_fail(&self.path)
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
    #[tracing::instrument(skip(self))]
    pub async fn load_module(&self, path: Arc<PathBuf>) -> LoaderResult {
        match tokio::fs::try_exists(path.as_ref()).await {
            Ok(exists) => {
                if !exists {
                    return Err(LoaderError::ModuleFileNotFound { path });
                }
            }
            Err(err) => {
                return Err(LoaderError::Unknown {
                    path,
                    error: ferr!("failed to check if file exists").error(err),
                });
            }
        }
        let command = Self::get_load_command(
            ModuleType::try_from(path.as_path()).unwrap_or_log(),
            &path,
            &self.base_dir,
        )
        .await?;
        debug!(?path, "loading module");
        self.load_command(command, &path).await
    }

    #[tracing::instrument(skip(self))]
    async fn load_command(&self, mut command: Command, path: &Path) -> LoaderResult {
        let path: Arc<PathBuf> = path.to_path_buf().into();

        command
            .env("META_CLI_TG_PATH", path.display().to_string())
            .env("META_CLI_SERVER_PORT", get_instance_port().to_string())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        use process_wrap::tokio::*;
        let mut child = TokioCommandWrap::from(command)
            .wrap(KillOnDrop)
            // we use sessions so that kill on drop
            // signals will get all grand-children
            .wrap(ProcessSession)
            .spawn()
            .map_err(|err| LoaderError::LoaderProcess {
                path: path.clone(),
                error: err.into(),
            })?;

        let duration =
            get_loader_timeout_duration().map_err(|err| LoaderError::Other { error: err })?;
        match timeout(duration, Box::into_pin(child.wait())).await {
            Err(_) => {
                Box::into_pin(child.kill()).await.unwrap_or_log();
                Err(LoaderError::LoaderTimeout { path: path.clone() })
            }
            Ok(exit) => {
                let exit = exit.map_err(|e| LoaderError::LoaderProcess {
                    path: path.clone(),
                    error: e.into(), // generic
                })?;
                if exit.success() {
                    #[cfg(debug_assertions)]
                    {
                        if let Some(stderr) = child.stderr().take().as_mut() {
                            // TODO console actor
                            let mut buff = String::new();
                            stderr.read_to_string(&mut buff).await.map_err(|e| {
                                LoaderError::LoaderProcess {
                                    path: path.clone(),
                                    error: e.into(),
                                }
                            })?;
                            if !buff.is_empty() {
                                info!("loader stderr: {buff}");
                            }
                        }
                    }
                    Ok(TypegraphInfos {
                        path: path.as_ref().to_owned(),
                        base_path: self.base_dir.clone(),
                    })
                } else {
                    let stderr = match child.stderr().take().as_mut() {
                        Some(value) => {
                            let mut buff = String::new();
                            value.read_to_string(&mut buff).await.map_err(|e| {
                                LoaderError::LoaderProcess {
                                    path: path.clone(),
                                    error: e.into(),
                                }
                            })?;
                            buff.to_owned()
                        }
                        None => "".to_string(),
                    };

                    let stdout = match child.stdout().take().as_mut() {
                        Some(value) => {
                            let mut buff = String::new();
                            value.read_to_string(&mut buff).await.map_err(|e| {
                                LoaderError::LoaderProcess {
                                    path: path.clone(),
                                    error: e.into(),
                                }
                            })?;
                            buff.to_owned()
                        }
                        None => "".to_string(),
                    };

                    use color_eyre::SectionExt;
                    Err(LoaderError::LoaderProcess {
                        path: path.clone(),
                        error: ferr!("loader process err")
                            .section(stdout.trim().to_string().header("Stdout:"))
                            .section(stderr.trim().to_string().header("Stderr:"))
                            .suppress_backtrace(true),
                    })
                }
            }
        }
    }

    #[tracing::instrument(err)]
    async fn get_load_command(
        module_type: ModuleType,
        path: &Path,
        base_dir: &Path,
    ) -> Result<Command, LoaderError> {
        if let Ok(argv_str) = std::env::var("MCLI_LOADER_CMD") {
            let argv = argv_str.split(' ').collect::<Vec<_>>();
            let mut command = Command::new(argv[0]);
            command
                .args(&argv[1..])
                .arg(path.to_str().unwrap())
                .arg(base_dir);
            return Ok(command);
        }

        match module_type {
            ModuleType::Python => {
                ensure_venv(path).map_err(|e| LoaderError::PythonVenvNotFound {
                    path: path.to_owned().into(),
                    error: e,
                })?;
                let loader_py =
                    std::env::var("MCLI_LOADER_PY").unwrap_or_else(|_| "python3".to_string());
                let mut loader_py = loader_py.split_whitespace();
                let mut command = Command::new(loader_py.next().unwrap());
                command
                    .args(loader_py)
                    .arg(path.to_str().unwrap())
                    .current_dir(base_dir)
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
                            // .arg("--unstable")
                            .arg("--allow-all")
                            .arg("--check")
                            .arg(path.to_str().unwrap())
                            .current_dir(base_dir);
                        Ok(command)
                    }
                    TsLoaderRt::Node => {
                        log::debug!("loading typegraph using npm x tsx, make sure npm packages have been installed");
                        let mut command = Command::new("npm");
                        command
                            .arg("x")
                            .arg("--yes")
                            .arg("tsx")
                            .current_dir(path.parent().unwrap())
                            .arg(path.to_str().unwrap());
                        Ok(command)
                    }
                    TsLoaderRt::Bun => {
                        log::debug!("loading typegraph using bun x tsx, make sure npm packages have been installed");
                        let mut command = Command::new("bun");
                        command
                            .arg("x")
                            .arg("tsx")
                            .arg(path.to_str().unwrap())
                            .current_dir(path.parent().unwrap());
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
    };
    let test_node_exec = || async {
        Command::new("node")
            .arg("-v")
            .output()
            .await
            .map(|out| out.status.success())
    };
    let test_bun_exec = || async {
        Command::new("deno")
            .arg("--version")
            .output()
            .await
            .map(|out| out.status.success())
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
    Err(ferr!("unable to find deno, node or bun runtimes"))
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
    LoaderTimeout {
        path: Arc<PathBuf>,
    },
    Other {
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

impl core::fmt::Display for LoaderError {
    fn fmt(&self, fmt: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PostProcessingError {
                path,
                typegraph_name,
                error,
            } => {
                write!(
                    fmt,
                    "error while post processing typegraph {name} from {path:?}: {error:?}",
                    name = typegraph_name.blue()
                )
            }
            Self::SerdeJson {
                path,
                content,
                error,
            } => {
                write!(
                    fmt,
                "error while parsing raw typegraph JSON from {path:?}: {error:?} in {content:?}")
            }
            Self::LoaderProcess { path, error } => {
                write!(
                    fmt,
                    "loader process error while loading typegraph(s) from {path:?}: {error:?}"
                )
            }
            Self::LoaderTimeout { path } => {
                write!(
                    fmt,
                    "loader process timed out while loading typegraph(s) from {path:?}"
                )
            }
            Self::Other { error } => {
                write!(fmt, "unknown error: {error:?}")
            }
            Self::Unknown { path, error } => {
                write!(
                    fmt,
                    "unknown error while loading typegraph(s) from {path:?}: {error:?}"
                )
            }
            Self::ModuleFileNotFound { path } => {
                write!(fmt, "module file not found: {path:?}")
            }
            Self::PythonVenvNotFound { path, error } => {
                write!(
                    fmt,
                    "python venv (.venv) not found in parent directories of {path:?}: {error:?}",
                )
            }
        }
    }
}

fn get_loader_timeout_duration() -> Result<Duration> {
    let env_key = "LOADER_TIMEOUT";
    let secs = match std::env::var(env_key) {
        Ok(value) => {
            let value = value
                .parse::<u64>()
                .context(format!("{env_key} is not a positive integer"))?;
            if value < 1 {
                bail!("{env_key:?} cannot be less than 1");
            }
            value
        }
        Err(_) => 120,
    };
    Ok(Duration::from_secs(secs))
}
