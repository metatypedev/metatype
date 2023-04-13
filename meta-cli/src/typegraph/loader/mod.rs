// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod discovery;
pub mod queue;
pub mod watch;

pub use discovery::Discovery;
use tokio::process::Command;

use std::{
    collections::{HashMap, HashSet},
    env,
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
};

use anyhow::{bail, Context, Error, Result};
use colored::Colorize;
use common::typegraph::Typegraph;

use crate::config::Config;

use super::postprocess::{self, apply_all, PostProcessorWrapper};

#[derive(Clone)]
pub struct Loader {
    config: Arc<Config>,
    skip_deno_modules: bool,
    postprocessors: Vec<PostProcessorWrapper>,
}

pub enum LoaderResult {
    Loaded(Vec<Typegraph>),
    Rewritten(PathBuf),
    Error(LoaderError),
}

impl Loader {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            skip_deno_modules: false,
            postprocessors: vec![postprocess::ReformatScripts.into()],
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

    pub async fn load_file(&self, path: &Path) -> LoaderResult {
        match self.load_python_module(path).await {
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
            bail!("Python error:\n{}", stderr.red())
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
            Self::Unknown { path, error } => {
                format!("Error while loading typegraph(s) from {path:?}: {error:?}")
            }
        }
    }
}

// TODO use Rc<PathBuf>
#[derive(Default)]
struct DependencyGraph {
    deps: HashMap<PathBuf, HashSet<PathBuf>>, // typegraph -> deno modules
    reverse_deps: HashMap<PathBuf, HashSet<PathBuf>>, // deno module -> typegraphs
}

impl DependencyGraph {
    /// return the list of removed dependencies and added dependencies
    fn update_typegraph(&mut self, tg: &Typegraph) {
        let path = tg.path.clone().unwrap();
        if !self.deps.contains_key(&path) {
            self.deps.insert(path.clone(), HashSet::default());
        }

        let deps = self.deps.get_mut(&path).unwrap();
        let old_deps = std::mem::replace(deps, tg.deps.iter().cloned().collect());
        let removed_deps = old_deps.difference(deps);
        let added_deps = deps.difference(&old_deps);

        for removed in removed_deps {
            let rdeps = self.reverse_deps.get_mut(removed).unwrap();
            rdeps.take(&path).unwrap();
            if rdeps.is_empty() {
                self.reverse_deps.remove(removed);
            }
        }

        for added in added_deps {
            if let Some(set) = self.reverse_deps.get_mut(added) {
                set.insert(path.clone());
            } else {
                self.reverse_deps
                    .insert(added.clone(), HashSet::from_iter(Some(path.clone())));
            }
        }
    }

    fn remove_typegraph_at(&mut self, path: &Path) {
        let deps = self.deps.remove(path);
        if let Some(deps) = deps {
            for dep in deps.iter() {
                let rdeps = self.reverse_deps.get_mut(dep).unwrap();
                rdeps.take(path).unwrap();
                if rdeps.is_empty() {
                    self.reverse_deps.remove(dep);
                }
            }
        }
    }
}
