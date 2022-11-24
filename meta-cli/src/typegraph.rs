// Copyright Metatype under the Elastic License 2.0.

use anyhow::{bail, Context, Result};
use colored::Colorize;
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::{DirEntry, WalkDir};

use crate::ts::parser::{parse_module_source, transform_module, transform_script};

pub type LoaderResult = HashMap<String, Result<Vec<Typegraph>>>;

#[derive(Clone)]
pub struct TypegraphLoader {
    working_dir: PathBuf,
    skip_deno_modules: bool,
    ignore_unknown_file_types: bool,
}

impl TypegraphLoader {
    pub fn new() -> Self {
        Self {
            working_dir: env::current_dir().unwrap(),
            skip_deno_modules: false,
            ignore_unknown_file_types: false,
        }
    }

    pub fn working_dir<P: AsRef<Path>>(mut self, dir: P) -> Self {
        self.working_dir = self.working_dir.join(dir.as_ref()).canonicalize().unwrap();
        self
    }

    pub fn skip_deno_modules(mut self) -> Self {
        self.skip_deno_modules = true;
        self
    }

    pub fn ignore_unknown_file_types(mut self) -> Self {
        self.ignore_unknown_file_types = true;
        self
    }

    pub fn load_file<P: AsRef<Path>>(self, path: P) -> Result<Option<Vec<Typegraph>>> {
        // TODO no unwrap
        let ext = path.as_ref().extension().and_then(|ext| ext.to_str());

        let tgs = match ext {
            Some(ext) if ext == "py" => self
                .load_python_module(path.as_ref())
                .with_context(|| format!("Loading python module {:?}", path.as_ref()))?,
            _ => {
                if self.ignore_unknown_file_types {
                    return Ok(None);
                } else {
                    let ext = ext
                        .map(|ext| format!(".{ext}"))
                        .unwrap_or_else(|| "".to_owned());
                    bail!("Unsupported typegraph definition module with extension \".{ext}\": current version only support Python modules.");
                }
            }
        };

        let tgs: Vec<Typegraph> = serde_json::from_str(&tgs)?;
        Ok(Some(
            tgs.into_iter()
                .map(postprocess)
                .collect::<Result<Vec<_>>>()?,
        ))
    }

    pub fn load_files(self, files: &[PathBuf]) -> LoaderResult {
        files
            .iter()
            .filter_map(
                |file| match self.clone().load_file(self.working_dir.join(file)) {
                    Ok(None) => None, // unreachable case
                    Ok(Some(tgs)) => Some((file.to_str().unwrap().to_owned(), Ok(tgs))),
                    Err(e) => Some((file.to_str().unwrap().to_owned(), Err(e))),
                },
            )
            .collect()
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<LoaderResult> {
        let dir = self.working_dir.join(dir);
        // self.collect_typegraphs([dir.as_ref().to_owned()])
        let metadata =
            fs::metadata(&dir).with_context(|| format!("Reading the metadata of {:?}", dir))?;
        if !metadata.is_dir() {
            bail!("Expected a directory");
        }

        let loader = self.ignore_unknown_file_types();

        Ok(WalkDir::new(dir)
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
        // TODO ensure venv

        let p = Command::new("py-tg")
            .arg(path.as_ref().to_str().unwrap())
            .current_dir(self.working_dir)
            .envs(env::vars())
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if self.skip_deno_modules { "1" } else { "" },
            )
            .output()
            .with_context(|| format!("Running the command 'py-tg {:?}'", path.as_ref()))?;

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
        let mut mat_data: FunctionMatData =
            utils::object_from_hashmap(std::mem::take(&mut mat.data))?;
        // TODO check variable `_my_lambda` exists and is a function expression/lambda
        mat_data.script = transform_script(mat_data.script)?;
        mat.data = utils::hashmap_from_object(mat_data)?;
    }
    Ok(mat)
}

fn postprocess_module_mat(mut mat: Materializer, typegraph: &Typegraph) -> Result<Materializer> {
    if mat.name == "module" && typegraph.runtimes[mat.runtime as usize].name == "deno" {
        let mut mat_data: ModuleMatData =
            utils::object_from_hashmap(std::mem::take(&mut mat.data))?;
        if !mat_data.code.starts_with("file:") {
            // TODO check imported functions exist
            let module = parse_module_source(mat_data.code)?;
            mat_data.code = transform_module(module)?;
        }
        mat.data = utils::hashmap_from_object(mat_data)?;
    }
    Ok(mat)
}

mod utils {
    use anyhow::{bail, Result};
    use serde::{de::DeserializeOwned, ser::Serialize};
    use serde_json::{from_value, to_value, Value};
    use std::collections::HashMap;

    pub fn object_from_hashmap<T: DeserializeOwned>(map: HashMap<String, Value>) -> Result<T> {
        let map = Value::Object(map.into_iter().collect());
        Ok(from_value(map)?)
    }

    pub fn hashmap_from_object<T: Serialize>(obj: T) -> Result<HashMap<String, Value>> {
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
