// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{bail, Context, Result};
use colored::Colorize;
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
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
use typescript::parser::{transform_module, transform_script};

pub type LoaderResult = HashMap<String, Result<Vec<Typegraph>>>;

#[derive(Clone)]
pub struct TypegraphLoader<'a> {
    skip_deno_modules: bool,
    ignore_unknown_file_types: bool,
    config: &'a Config,
}

impl<'a> TypegraphLoader<'a> {
    // pub fn new() -> Self {
    //     Self {
    //         skip_deno_modules: false,
    //         ignore_unknown_file_types: false,
    //         config: None,
    //     }
    // }

    pub fn with_config(config: &'a Config) -> Self {
        Self {
            skip_deno_modules: false,
            ignore_unknown_file_types: false,
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

    pub fn load_file<P: AsRef<Path>>(self, path: P) -> Result<Option<Vec<Typegraph>>> {
        let path = path.as_ref();
        let ext = path.extension().and_then(|ext| ext.to_str());

        let output = match ext {
            Some(ext) if ext == "py" => self
                .load_python_module(path)
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
            let tgs: Vec<Typegraph> =
                serde_json::from_str(&output).context("Parsing serialized typegraph")?;
            Ok(Some(
                tgs.into_iter()
                    .map(postprocess)
                    .collect::<Result<Vec<_>>>()?,
            ))
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
                    let rel_path = crate::utils::relative_path_display(&dir, path);

                    println!(
                        "{}",
                        format!("Found typegraph definition module at {rel_path}").dimmed()
                    );
                    Some(relative)
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

        let current_dir = crate::utils::strip_unc_prefix(&self.config.base_dir);
        let p = Command::new(program_name.clone())
            .arg(path.as_ref().to_str().unwrap())
            // .args(args)
            .current_dir(current_dir)
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

type MaterializerPostprocessor = fn(Materializer, &Typegraph) -> Result<Materializer>;

static MATERIALIZER_POSTPROCESSORS: &[MaterializerPostprocessor] =
    &[postprocess_function_mat, postprocess_module_mat];

/// Perform some postprocessing on the typegraph we got from Python
fn postprocess(mut typegraph: Typegraph) -> Result<Typegraph> {
    let materializers = std::mem::take(&mut typegraph.materializers);
    let postprocessed_materializers: Vec<Materializer> = materializers
        .into_iter()
        .map(|mat| -> Result<Materializer> {
            let mut current_value = mat;
            for postprocess in MATERIALIZER_POSTPROCESSORS {
                current_value = postprocess(current_value, &typegraph)?;
            }
            Ok(current_value)
        })
        .collect::<Result<Vec<Materializer>>>()?;
    typegraph.materializers = postprocessed_materializers;
    Ok(typegraph)
}

fn postprocess_function_mat(mut mat: Materializer, typegraph: &Typegraph) -> Result<Materializer> {
    if &mat.name == "function" && typegraph.runtimes[mat.runtime as usize].name == "deno" {
        let mut mat_data: FunctionMatData = utils::object_from_map(std::mem::take(&mut mat.data))?;
        // TODO check variable `_my_lambda` exists and is a function expression/lambda
        mat_data.script = transform_script(mat_data.script)?;
        mat.data = utils::map_from_object(mat_data)?;
    }
    Ok(mat)
}

fn postprocess_module_mat(mut mat: Materializer, typegraph: &Typegraph) -> Result<Materializer> {
    if mat.name == "module" && typegraph.runtimes[mat.runtime as usize].name == "deno" {
        let mut mat_data: ModuleMatData = utils::object_from_map(std::mem::take(&mut mat.data))?;
        if !mat_data.code.starts_with("file:") {
            // TODO check imported functions exist
            mat_data.code = transform_module(mat_data.code)?;
        }
        mat.data = utils::map_from_object(mat_data)?;
    }
    Ok(mat)
}

mod utils {
    use anyhow::{bail, Result};
    use indexmap::IndexMap;
    use serde::{de::DeserializeOwned, ser::Serialize};
    use serde_json::{from_value, to_value, Value};

    pub fn object_from_map<T: DeserializeOwned>(map: IndexMap<String, Value>) -> Result<T> {
        let map = Value::Object(map.into_iter().collect());
        Ok(from_value(map)?)
    }

    pub fn map_from_object<T: Serialize>(obj: T) -> Result<IndexMap<String, Value>> {
        let val = to_value(obj)?;
        if let Value::Object(map) = val {
            Ok(map.into_iter().collect())
        } else {
            bail!("value is not an object");
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
