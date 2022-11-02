// Copyright Metatype under the Elastic License 2.0.

use anyhow::{anyhow, bail, Context, Result};
use common::typegraph::Typegraph;
use std::collections::HashMap;
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

pub struct TypegraphLoader {
    skip_deno_modules: bool,
    working_dir: Option<PathBuf>,
}

impl TypegraphLoader {
    pub fn new() -> Self {
        Self {
            skip_deno_modules: false,
            working_dir: None,
        }
    }

    pub fn working_dir<P: AsRef<Path>>(mut self, dir: P) -> Self {
        self.working_dir = Some(dir.as_ref().to_path_buf());
        self
    }

    pub fn skip_deno_modules(mut self) -> Self {
        self.skip_deno_modules = true;
        self
    }

    pub fn load_file<P: AsRef<Path>>(self, file: P) -> Result<HashMap<String, Typegraph>> {
        self.collect_typegraphs([file.as_ref().to_owned()])
    }

    pub fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, Typegraph>> {
        self.collect_typegraphs(files.iter().cloned())
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, Typegraph>> {
        self.collect_typegraphs([dir.as_ref().to_owned()])
    }

    fn collect_typegraphs<I: IntoIterator<Item = PathBuf>>(
        self,
        sources: I,
    ) -> Result<HashMap<String, Typegraph>> {
        let cwd = env::current_dir()?;
        let working_dir = self.working_dir.as_ref().unwrap_or(&cwd);

        let test = Command::new("py-tg")
            .args(
                sources
                    .into_iter()
                    .map(|p| p.into_os_string().into_string().unwrap()),
            )
            .current_dir(working_dir)
            .envs(env::vars())
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if self.skip_deno_modules { "1" } else { "" },
            )
            .output()?;

        let stdout = String::from_utf8(test.stdout)?;

        if !test.status.success() {
            let stderr = String::from_utf8(test.stderr)?;

            if stderr.contains("ModuleNotFoundError: No module named 'typegraph'") {
                bail!(
                    "typegraph module not found in venv, install it with `pip install typegraph`",
                );
            }

            bail!(
                "PythonError\n{}\n{}",
                if stdout.len() > 128 {
                    &stdout[stdout.len() - 128..]
                } else {
                    &stdout
                },
                stderr
            );
        }

        let tgs: Vec<Typegraph> = serde_json::from_str(&stdout).with_context(|| {
            if stdout.len() > 64 {
                format!("cannot parse typegraph: {} (first 64 chars)", &stdout[..64])
            } else {
                format!("cannot parse typegraph: {}", stdout)
            }
        })?;

        tgs.into_iter()
            .map(|tg| tg.name().map(|name| (name, tg)))
            .collect()
    }
}

pub trait UniqueTypegraph {
    fn get_unique(self) -> Result<Typegraph>;
}

impl UniqueTypegraph for HashMap<String, Typegraph> {
    fn get_unique(self) -> Result<Typegraph> {
        if self.len() != 1 {
            Err(anyhow!("requires one and only one typegraph in the map"))
        } else {
            Ok(self.into_iter().next().unwrap().1)
        }
    }
}
