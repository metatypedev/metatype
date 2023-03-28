// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod postprocess;
pub mod utils;

use anyhow::{bail, Context, Result};
use colored::Colorize;
use common::typegraph::Typegraph;
use pathdiff::diff_paths;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::Stdio;
use walkdir::{DirEntry, WalkDir};

use crate::config::Config;
use crate::utils::ensure_venv;
use postprocess::apply_all;

use self::postprocess::PostProcessorWrapper;

pub type LoaderResult = HashMap<String, Result<Vec<Typegraph>>>;

#[derive(Clone)]
pub struct TypegraphLoader<'a> {
    skip_deno_modules: bool,
    ignore_unknown_file_types: bool,
    config: &'a Config,
    postprocessors: Vec<PostProcessorWrapper>,
}

impl<'a> TypegraphLoader<'a> {
    pub fn with_config(config: &'a Config) -> Self {
        Self {
            skip_deno_modules: false,
            ignore_unknown_file_types: false,
            postprocessors: vec![postprocess::deno_rt::ReformatScripts.into()],
            config,
        }
    }

    pub fn skip_deno_modules(mut self) -> Self {
        self.skip_deno_modules = true;
        self
    }

    // Loading a file shall fail if the file type is unsupported.
    // This is used when walking through directories, where unknown file types
    // should be skipped.
    pub fn ignore_unknown_file_types(mut self) -> Self {
        self.ignore_unknown_file_types = true;
        self
    }

    pub fn with_postprocessor(mut self, postprocessor: impl Into<PostProcessorWrapper>) -> Self {
        self.postprocessors.push(postprocessor.into());
        self
    }

    pub fn load_file<P: AsRef<Path>>(mut self, path: P) -> Result<Option<Vec<Typegraph>>> {
        let path = path.as_ref().canonicalize()?;
        let ext = path.extension().and_then(|ext| ext.to_str());

        let config = self.config.clone();
        let postprocessors = std::mem::take(&mut self.postprocessors);

        let output = match ext {
            Some(ext) if ext == "py" => self
                .load_python_module(&path)
                .with_context(|| format!("Loading python module {:?}", path))?,
            _ => {
                if self.ignore_unknown_file_types {
                    return Ok(None);
                } else {
                    let ext = ext
                        .map(|ext| format!(".{ext}"))
                        .unwrap_or_else(|| "".to_owned());
                    bail!("Unsupported typegraph definition module with extension \"{ext}\": current version only support Python modules.");
                }
            }
        };

        if output.is_empty() {
            // an importer have written in the file
            Ok(None)
        } else {
            let mut tgs: Vec<Typegraph> =
                serde_json::from_str(&output).context("Parsing serialized typegraph")?;

            for tg in tgs.iter_mut() {
                apply_all(postprocessors.iter(), tg, &config)?;
            }

            Ok(Some(tgs))
        }
    }

    pub fn load_files(self, files: &[PathBuf]) -> LoaderResult {
        files
            .iter()
            .filter_map(|file| {
                let path = match file.canonicalize() {
                    Ok(path) => path,
                    Err(e) => {
                        return Some((
                            file.to_str().unwrap().to_owned(),
                            Err(e).with_context(|| {
                                format!("could not canonicalize path: {:?}", file)
                            }),
                        ))
                    }
                };
                match self.clone().load_file(path) {
                    Ok(None) => None, // unreachable case
                    Ok(Some(tgs)) => Some((file.to_str().unwrap().to_owned(), Ok(tgs))),
                    Err(e) => Some((file.to_str().unwrap().to_owned(), Err(e))),
                }
            })
            .collect()
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<LoaderResult> {
        let dir = dir.as_ref().canonicalize()?;
        let metadata =
            fs::metadata(&dir).with_context(|| format!("Reading the metadata of {:?}", dir))?;
        if !metadata.is_dir() {
            bail!("Expected a directory");
        }

        let loader = self.ignore_unknown_file_types();

        let py_loader = loader.config.loader("python").unwrap(); // cannot be none
        let include_set = py_loader.get_include_set()?;
        let exclude_set = py_loader.get_exclude_set()?;

        Ok(WalkDir::new(dir.clone())
            .into_iter()
            .filter_entry(|e| !is_hidden(e))
            .filter_map(|e| {
                // filter files
                e.ok().map(|e| e.path().to_owned()).filter(|path| {
                    fs::metadata(path)
                        .ok()
                        .map(|m| m.is_file())
                        .unwrap_or(false)
                })
            })
            .filter_map(|path| {
                // inclusion/exclusion
                let relative = diff_paths(&path, &loader.config.base_dir).unwrap();
                let included = include_set.is_empty() || include_set.is_match(&relative);
                let excluded = !exclude_set.is_empty() && exclude_set.is_match(&relative);
                if included && !excluded {
                    let rel_path = crate::utils::relative_path_display(dir.clone(), path.clone());

                    println!(
                        "{}",
                        format!("Found typegraph definition module at {rel_path}").dimmed()
                    );
                    Some(path)
                } else {
                    None
                }
            })
            .filter_map(|file| match loader.clone().load_file(&file) {
                Ok(None) => None,
                Ok(Some(tgs)) => Some((file.to_str().unwrap().to_owned(), Ok(tgs))),
                Err(e) => Some((file.to_str().unwrap().to_owned(), Err(e))),
            })
            .collect())
    }

    // Language-specific steps.
    // Returning typegraphs in raw (before post-processing) JSON.

    pub fn load_python_module<P: AsRef<Path>>(self, path: P) -> Result<String> {
        ensure_venv(&self.config.base_dir)?;

        // Search in PATH does not work on Windows
        // See: https://doc.rust-lang.org/std/process/struct.Command.html#method.new
        #[cfg(target_os = "windows")]
        let program_name = Path::new(&env::var("VIRTUAL_ENV")?).join("Scripts/py-tg.cmd");
        #[cfg(not(target_os = "windows"))]
        let program_name = Path::new("py-tg").to_path_buf();

        let p = Command::new(program_name.clone())
            .arg(path.as_ref().to_str().unwrap())
            // .args(args)
            .current_dir(&self.config.base_dir)
            .envs(env::vars())
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if self.skip_deno_modules { "1" } else { "" },
            )
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .with_context(|| {
                format!(
                    "Running the command '{:?} {:?}'",
                    program_name,
                    path.as_ref()
                )
            })?;

        if p.status.success() {
            Ok(String::from_utf8(p.stdout)?)
        } else {
            let stderr = String::from_utf8(p.stderr)?;
            bail!("Python error:\n{}", stderr.red())
        }
    }
}

fn is_hidden(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}
