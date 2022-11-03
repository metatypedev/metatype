// Copyright Metatype under the Elastic License 2.0.

use anyhow::{anyhow, bail, Context, Result};
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use std::collections::HashMap;
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::ts::parser::{parse_module_source, transform_module, transform_script};

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
        postprocess_all(self.collect_typegraphs([file.as_ref().to_owned()])?)
    }

    pub fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, Typegraph>> {
        postprocess_all(self.collect_typegraphs(files.iter().cloned())?)
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, Typegraph>> {
        postprocess_all(self.collect_typegraphs([dir.as_ref().to_owned()])?)
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

fn postprocess_all(tgs: HashMap<String, Typegraph>) -> Result<HashMap<String, Typegraph>> {
    tgs.into_iter()
        .map(|(name, tg)| postprocess(tg).map(|tg| (name, tg)))
        .collect()
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
