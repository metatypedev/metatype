// Copyright Metatype under the Elastic License 2.0.

use anyhow::{anyhow, bail, Result};
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use indoc::formatdoc;
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
        postprocess_all(self.python().load_file(file)?)
    }

    pub fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, Typegraph>> {
        postprocess_all(self.python().load_files(files)?)
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, Typegraph>> {
        postprocess_all(self.python().load_folder(dir)?)
    }

    fn python(self) -> PythonTdmLoader {
        PythonTdmLoader { loader: self }
    }
}

// Python typegraph definition module loader
struct PythonTdmLoader {
    loader: TypegraphLoader,
}

impl PythonTdmLoader {
    /// Load serialized typegraphs from a TDM
    fn load_file<P: AsRef<Path>>(self, file: P) -> Result<HashMap<String, Typegraph>> {
        self.collect_typegraphs(&format!(
            r#"loaders.import_file("{}")"#,
            file.as_ref().to_str().unwrap()
        ))
    }

    fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, Typegraph>> {
        let loader = files
            .iter()
            .map(|p| {
                format!(
                    r#"loaders.import_file("{file}")"#,
                    file = p.to_str().unwrap()
                )
            })
            .collect::<Vec<_>>()
            .join(" + ");
        self.collect_typegraphs(&loader)
    }

    /// Load serialized typegraphs from TDMs in `dir`
    fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, Typegraph>> {
        self.collect_typegraphs(&format!(
            r#"loaders.import_folder("{}")"#,
            dir.as_ref().to_str().unwrap()
        ))
    }

    fn collect_typegraphs(self, loader: &str) -> Result<HashMap<String, Typegraph>> {
        let cwd = env::current_dir()?;
        let working_dir = self.loader.working_dir.as_ref().unwrap_or(&cwd);

        let test = Command::new("python3")
            .arg("-c")
            .arg(formatdoc!(
                r#"
                from typegraph.utils import loaders
                import orjson
                tgs = {loader}
                serialized_tgs = {{tg.name: loaders.serialize_typegraph(tg) for tg in tgs}}
                print(orjson.dumps(serialized_tgs).decode())
            "#
            ))
            .current_dir(working_dir)
            .envs(env::vars())
            .env("PYTHONUNBUFFERED", "1")
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env(
                "DONT_READ_EXTERNAL_TS_FILES",
                if self.loader.skip_deno_modules {
                    "1"
                } else {
                    ""
                },
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

        let tgs: HashMap<String, String> = serde_json::from_str(&stdout).unwrap_or_else(|_| {
            panic!("cannot parse typegraph: {} (first 64 chars)", &stdout[..64])
        });

        tgs.into_iter()
            .map(|(k, v)| Typegraph::from_json(&v).map(|tg| (k, tg)))
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

type MaterializerPreprocessor = (
    fn(&Materializer, &Typegraph) -> bool,
    fn(Materializer, &Typegraph) -> Result<Materializer>,
);

static MATERIALIZER_POSTPROCESSORS: &[MaterializerPreprocessor] = &[
    (is_function_mat, postprocess_function_mat),
    (is_module_mat, postprocess_module_mat),
];

fn postprocess(mut typegraph: Typegraph) -> Result<Typegraph> {
    let materializers = std::mem::take(&mut typegraph.materializers);
    let postprocessed_materializers: Vec<Materializer> = materializers
        .into_iter()
        .map(|mat| -> Result<Materializer> {
            // TODO Cell
            let mut current_value = mat;
            for (test, postprocess) in MATERIALIZER_POSTPROCESSORS {
                if test(&current_value, &typegraph) {
                    current_value = postprocess(current_value, &typegraph)?;
                }
            }
            Ok(current_value)
        })
        .collect::<Result<Vec<Materializer>>>()?;
    typegraph.materializers = postprocessed_materializers;
    Ok(typegraph)
}

fn is_function_mat(mat: &Materializer, typegraph: &Typegraph) -> bool {
    &mat.name == "function" && typegraph.runtimes[mat.runtime as usize].name == "deno"
}

fn postprocess_function_mat(mut mat: Materializer, _: &Typegraph) -> Result<Materializer> {
    let mut mat_data: FunctionMatData = utils::object_from_hashmap(std::mem::take(&mut mat.data))?;
    // TODO check variable `_my_lambda` exists and is a function expression/lambda
    mat_data.script = transform_script(mat_data.script)?;
    mat.data = utils::hashmap_from_object(mat_data)?;
    Ok(mat)
}

fn is_module_mat(mat: &Materializer, typegraph: &Typegraph) -> bool {
    mat.name == "module" && typegraph.runtimes[mat.runtime as usize].name == "deno"
}

fn postprocess_module_mat(mut mat: Materializer, _: &Typegraph) -> Result<Materializer> {
    let mut mat_data: ModuleMatData = utils::object_from_hashmap(std::mem::take(&mut mat.data))?;
    // TODO check imported functions exist
    let module = parse_module_source(mat_data.code)?;
    mat_data.code = transform_module(module)?;
    mat.data = utils::hashmap_from_object(mat_data)?;
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
