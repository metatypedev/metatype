// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{anyhow, Context, Result};
use globset::{Glob, GlobSet, GlobSetBuilder};
use lazy_static::lazy_static;
use reqwest::Url;
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs::{self, File};
use std::io;
use std::path::{Path, PathBuf};
use std::slice;
use std::str::FromStr;

use crate::utils::BasicAuth;

lazy_static! {
    static ref DEFAULT_NODE_CONFIG: NodeConfig = Default::default();
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(untagged)]
pub enum Lift<T> {
    More(Vec<T>),
    One(T),
    #[default]
    Empty,
}

impl<T> Lift<T> {
    pub fn resolve(&self) -> &[T] {
        match self {
            Lift::More(vs) => vs,
            Lift::One(v) => slice::from_ref(v),
            Lift::Empty => &[],
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct NodeConfig {
    url: Url,
    username: Option<String>,
    password: Option<String>,
    password_env: Option<String>,
}

impl Default for NodeConfig {
    fn default() -> Self {
        NodeConfig {
            url: "http://localhost:7890".parse().unwrap(),
            username: None,
            password: None,
            password_env: None,
        }
    }
}

impl NodeConfig {
    pub fn url(&self, arg: Option<Url>) -> Url {
        arg.or_else(|| Some(self.url.clone()))
            .unwrap_or_else(|| "http://localhost:7890".parse().unwrap())
    }

    pub fn username(&self, arg: Option<String>) -> Option<String> {
        arg.or_else(|| self.username.clone())
    }

    pub fn password(&self, arg: Option<String>) -> Option<String> {
        arg.or_else(|| self.password.clone()).or_else(|| {
            self.password_env
                .as_ref()
                .and_then(|key| env::var(key).ok())
        })
    }

    pub fn basic_auth(
        &self,
        username: Option<String>,
        password: Option<String>,
    ) -> Result<BasicAuth> {
        let username = self.username(username);
        let password = self.password(password);

        match (username, password) {
            (Some(username), Some(password)) => Ok(BasicAuth::new(username, password)),
            (Some(username), None) => BasicAuth::as_user(username),
            (None, _) => BasicAuth::prompt(),
        }
    }
}

#[derive(Deserialize, Debug, Default)]
pub struct TypegraphLoaderConfig {
    #[serde(default)]
    include: Lift<String>,
    #[serde(default)]
    exclude: Lift<String>,
}

impl TypegraphLoaderConfig {
    pub fn get_include_set(&self) -> Result<GlobSet> {
        let mut builder = GlobSetBuilder::new();
        for glob in self.include.resolve().iter() {
            builder.add(Glob::new(glob)?);
        }
        Ok(builder.build()?)
    }

    pub fn get_exclude_set(&self) -> Result<GlobSet> {
        let mut builder = GlobSetBuilder::new();
        for glob in self.exclude.resolve().iter() {
            builder.add(Glob::new(glob)?);
        }
        Ok(builder.build()?)
    }
}

#[derive(Deserialize, Debug, Default)]
pub struct PrismaConfig {
    migrations_path: Option<PathBuf>,
}

impl PrismaConfig {
    pub fn migrations_path(&self) -> PathBuf {
        self.migrations_path
            .as_deref()
            .unwrap_or_else(|| Path::new("prisma/migrations"))
            .to_owned()
    }
}

#[derive(Deserialize, Debug, Default)]
pub struct Materializers {
    pub prisma: PrismaConfig,
}

#[derive(Deserialize, Debug, Default)]
pub struct Typegraphs {
    #[serde(default)]
    pub python: TypegraphLoaderConfig,
    #[serde(default)]
    pub materializers: Materializers,
}

#[derive(Deserialize, Debug, Default)]
pub struct Config {
    #[serde(skip)]
    pub base_dir: PathBuf,
    #[serde(default)]
    typegates: HashMap<String, NodeConfig>,
    #[serde(default)]
    pub typegraphs: Typegraphs,
}

impl FromStr for Config {
    type Err = serde_yaml::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        serde_yaml::from_str(s)
    }
}

impl Config {
    pub fn default_in<P: AsRef<Path>>(base_dir: P) -> Self {
        Self {
            base_dir: base_dir.as_ref().to_owned(),
            ..Default::default()
        }
    }

    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Config> {
        let path = fs::canonicalize(path)?;
        let file = File::open(&path).map_err(|err| match err.kind() {
            io::ErrorKind::NotFound => {
                anyhow!("file {} not found", path.to_str().unwrap())
            }
            _ => anyhow!(err.to_string()),
        })?;
        let mut config: Self = serde_yaml::from_reader(file)?;
        config.base_dir = {
            let mut path = path;
            path.pop();
            path
        };
        Ok(config)
    }

    /// Load config file: recursively search from `start_dir` to parent directories...
    pub fn find<P: AsRef<Path>>(start_dir: P) -> Result<Option<Config>> {
        let mut current_dir = fs::canonicalize(start_dir)?;

        let path = loop {
            let path = current_dir.join("metatype.yml");
            if path.try_exists()? {
                break path;
            }
            let path = current_dir.join("metatype.yaml");
            if path.try_exists()? {
                break path;
            }

            if !current_dir.pop() {
                return Ok(None);
            }
        };

        Ok(Some(Self::from_file(path)?))
    }

    /// Load config file:
    /// if the config_path is None, search the config file recursively on parent directories.
    pub fn load_or_find<P: AsRef<Path>>(
        config_path: Option<PathBuf>,
        search_start_dir: P,
    ) -> Result<Config> {
        if let Some(path) = config_path {
            Config::from_file(&path).with_context(|| format!("config file not found at {path:?}"))
        } else {
            Ok(Config::find(search_start_dir)?
                .ok_or_else(|| anyhow!("could not find config file"))?)
        }
    }

    pub fn node(&self, profile: &str) -> &NodeConfig {
        self.typegates.get(profile).unwrap_or(&DEFAULT_NODE_CONFIG)
    }

    pub fn loader(&self, lang: &str) -> Option<&TypegraphLoaderConfig> {
        match lang {
            "python" => Some(&self.typegraphs.python),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::tests::utils::assert_err_contains;

    use super::*;
    use project_root::get_project_root;

    #[test]
    fn load_missing_config_file() -> Result<()> {
        let project_root = get_project_root()?;
        let path = project_root.join("path/to/metatype.yml");
        let load_res = Config::load_or_find(Some(path), project_root);
        assert_err_contains(load_res, "config file not found at");
        Ok(())
    }

    #[test]
    fn find_config_file() -> Result<()> {
        let project_root = get_project_root()?;
        let config = Config::load_or_find(None, &project_root.join("meta-cli/tests/graphs/nested"));
        assert!(config.is_ok());
        let config = config.unwrap();
        assert_eq!(config.base_dir, project_root.join("meta-cli/tests"));
        Ok(())
    }
}
