use anyhow::{anyhow, Error, Result};
use common::typegraph::Typegraph;
use indoc::formatdoc;
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
        Self::from_json(self.serialized().load_file(file)?)
    }

    pub fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, Typegraph>> {
        Self::from_json(self.serialized().load_files(files)?)
    }

    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, Typegraph>> {
        Self::from_json(self.serialized().load_folder(dir)?)
    }

    pub fn serialized(self) -> SerializedTypegraphLoader {
        SerializedTypegraphLoader { loader: self }
    }

    fn from_json(tgs: HashMap<String, String>) -> Result<HashMap<String, Typegraph>> {
        tgs.into_iter()
            .map(|(k, v)| Typegraph::from_json(&v).map(|tg| (k, tg)))
            .collect::<Result<Vec<_>>>()
            .map(|v| v.into_iter().collect())
    }
}

pub struct SerializedTypegraphLoader {
    loader: TypegraphLoader,
}

impl SerializedTypegraphLoader {
    /// Load serialized typegraphs from a TDM
    pub fn load_file<P: AsRef<Path>>(self, file: P) -> Result<HashMap<String, String>> {
        self.collect_typegraphs(&format!(
            r#"loaders.import_file("{}")"#,
            file.as_ref().to_str().unwrap()
        ))
    }

    pub fn load_files(self, files: &[PathBuf]) -> Result<HashMap<String, String>> {
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
    pub fn load_folder<P: AsRef<Path>>(self, dir: P) -> Result<HashMap<String, String>> {
        self.collect_typegraphs(&format!(
            r#"loaders.import_folder("{}")"#,
            dir.as_ref().to_str().unwrap()
        ))
    }

    /// Load  serialized typegraphs from all TDMs in the current working directory and dist
    pub fn load_all(self) -> Result<HashMap<String, String>> {
        self.collect_typegraphs(r#"loaders.import_folder(".") + loaders.import_modules(dist)"#)
    }

    fn collect_typegraphs(self, loader: &str) -> Result<HashMap<String, String>> {
        let cwd = env::current_dir()?;
        let working_dir = self.loader.working_dir.as_ref().unwrap_or(&cwd);

        let test = Command::new("python3")
            .arg("-c")
            .arg(formatdoc!(
                r#"
            from typegraph.utils import loaders
            from typegraph import dist
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

        if !test.status.success() {
            let message = String::from_utf8(test.stderr)?;

            if message.contains("ModuleNotFoundError: No module named 'typegraph'") {
                return Err(Error::msg(
                    "typegraph module not found in venv, install it with `pip install typegraph`",
                ));
            }

            return Err(Error::msg(message));
        }

        let payload = String::from_utf8(test.stdout)?;
        let tgs: HashMap<String, String> = serde_json::from_str(&payload)?;
        Ok(tgs)
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
