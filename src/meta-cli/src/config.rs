// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use crate::cli::NodeArgs;
use crate::fs::find_in_parents;
use crate::utils::BasicAuth;
use globset::{Glob, GlobSet, GlobSetBuilder};
use reqwest::Url;
use std::fs::{self, File};
use std::io;
use std::slice;
use std::str::FromStr;
use typegate_api::Node;

pub const METATYPE_FILES: &[&str] = &["metatype.yml", "metatype.yaml"];
pub const VENV_FOLDERS: &[&str] = &[".venv"];
pub const PYPROJECT_FILES: &[&str] = &["pyproject.toml"];
pub const PIPFILE_FILES: &[&str] = &["Pipfile"];
pub const REQUIREMENTS_FILES: &[&str] = &["requirements.txt"];

static DEFAULT_NODE_CONFIG: once_cell::sync::Lazy<NodeConfig> =
    once_cell::sync::Lazy::new(Default::default);
static DEFAULT_LOADER_CONFIG: once_cell::sync::Lazy<TypegraphLoaderConfig> =
    once_cell::sync::Lazy::new(Default::default);

const DEFAULT_PRISMA_MIGRATIONS_PATH: &str = "prisma-migrations";

pub enum PathOption {
    Absolute,
    Relative,
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

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct NodeConfig {
    pub url: Url,
    pub prefix: Option<String>,
    username: Option<String>,
    password: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// tg_name -> {key -> secret}
    #[serde(default)]
    pub secrets: HashMap<String, HashMap<String, String>>,
}

impl Default for NodeConfig {
    fn default() -> Self {
        NodeConfig {
            url: "http://localhost:7890".parse().unwrap(),
            prefix: None,
            username: None,
            password: None,
            env: HashMap::default(),
            secrets: HashMap::default(),
        }
    }
}

impl NodeConfig {
    pub fn with_args(&self, args: &NodeArgs) -> Self {
        let mut res = self.clone();
        if let Some(gate) = &args.gate {
            res.url = gate.clone();
        }
        if let Some(prefix) = &args.prefix {
            res.prefix = Some(prefix.clone());
        }
        res.username = args.username.clone().or(res.username);
        res.password = args.password.clone().or(res.password);
        res
    }

    async fn basic_auth<P: AsRef<Path>>(&self, dir: P) -> Result<BasicAuth> {
        match (&self.username, &self.password) {
            (Some(username), Some(password)) => Ok(BasicAuth::new(
                lade_sdk::hydrate_one(username.clone(), dir.as_ref())
                    .await
                    .map_err(anyhow_to_eyre!())
                    .context("error hydrating typegate username")?,
                lade_sdk::hydrate_one(password.clone(), dir.as_ref())
                    .await
                    .map_err(anyhow_to_eyre!())
                    .context("error hydrating typegate password")?,
            )),
            (Some(username), None) => BasicAuth::prompt_as_user(username.clone()),
            (None, _) => BasicAuth::prompt(),
        }
    }

    #[cfg_attr(feature = "tracing-instrument", tracing::instrument)]
    pub async fn get_admin_password(
        &self,
        dir: impl AsRef<Path> + std::fmt::Debug,
    ) -> Result<String> {
        let raw_username = self
            .username
            .clone()
            .ok_or_else(|| ferr!("no username in config file metatype.yaml"))?;

        let raw_password = self
            .password
            .clone()
            .ok_or_else(|| ferr!("no password in config file metatype.yaml"))?;

        let username = lade_sdk::hydrate_one(raw_username, dir.as_ref())
            .await
            .map_err(anyhow_to_eyre!())
            .context("error hydrating username")?;

        if &username != "admin" {
            return Err(ferr!(
                "username in config file metatype.yaml is not 'admin'"
            ));
        }

        let password = lade_sdk::hydrate_one(raw_password, dir.as_ref())
            .await
            .map_err(anyhow_to_eyre!())
            .context("error hydrating password")?;

        Ok(password)
    }

    #[cfg_attr(feature = "tracing-instrument", tracing::instrument)]
    pub async fn build<P: AsRef<Path> + core::fmt::Debug>(&self, dir: P) -> Result<Node> {
        Node::new(
            self.url.clone(),
            self.prefix.clone(),
            Some(self.basic_auth(dir).await?.into()),
        )
        .map_err(anyhow_to_eyre!())
    }
}

#[derive(Deserialize, Debug, Default, Clone)]
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

#[derive(Deserialize, Debug, Default, Clone)]
pub struct PrismaConfig {
    pub migrations_path: Option<PathBuf>,
}

#[derive(Deserialize, Debug, Default, Clone)]
pub struct Materializers {
    pub prisma: PrismaConfig,
}

#[derive(Deserialize, Debug, Clone, Copy, Hash, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ModuleType {
    Python,
    TypeScript,
    JavaScript,
}

#[derive(Deserialize, Debug, Default, Clone)]
pub struct Typegraphs {
    #[serde(flatten)]
    pub loaders: HashMap<ModuleType, TypegraphLoaderConfig>,
    #[serde(default)]
    pub materializers: Materializers,
}

#[derive(Deserialize, Debug, Default, Clone)]
pub struct Config {
    #[serde(skip)]
    pub path: Option<PathBuf>,
    #[serde(skip)]
    pub base_dir: PathBuf,
    #[serde(default)]
    pub typegates: HashMap<String, NodeConfig>,
    #[serde(default)]
    pub typegraphs: Typegraphs,
    #[serde(default)]
    pub metagen: Option<metagen::Config>,
}

impl FromStr for Config {
    type Err = serde_yaml::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut config: serde_yaml::Value = serde_yaml::from_str(s)?;
        config.apply_merge()?;
        serde_yaml::from_value(config)
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
                ferr!("file {} not found", path.to_str().unwrap())
            }
            _ => ferr!("file open error: {err}"),
        })?;
        let mut config: serde_yaml::Value = serde_yaml::from_reader(file)?;
        config.apply_merge()?;
        let mut config: Self = serde_yaml::from_value(config)
            .wrap_err_with(|| format!("error parsing metatype config found at {path:?}"))?;
        config.path = Some(path.clone());
        config.base_dir = {
            let mut path = path;
            path.pop();
            path
        };
        Ok(config)
    }

    /// Load config file: recursively search from `start_dir` to parent directories...
    pub fn find<P: AsRef<Path>>(start_dir: P) -> Result<Option<Config>> {
        if let Some(path) = find_in_parents(start_dir, METATYPE_FILES)? {
            Ok(Some(Self::from_file(path)?))
        } else {
            Ok(None)
        }
    }

    /// Load config file:
    /// if the config_path is None, search the config file recursively on parent directories.
    pub fn load_or_find(
        config_path: Option<&Path>,
        search_start_dir: impl AsRef<Path>,
    ) -> Result<Config> {
        if let Some(path) = config_path {
            Config::from_file(path).with_context(|| format!("config file not found at {path:?}"))
        } else {
            Ok(Config::find(search_start_dir)?
                .ok_or_else(|| ferr!("could not find config file"))?)
        }
    }

    pub fn node(&self, args: &NodeArgs, target: &str) -> NodeConfig {
        self.typegates
            .get(target)
            .unwrap_or(&DEFAULT_NODE_CONFIG)
            .with_args(args)
    }

    pub fn loader(&self, module_type: ModuleType) -> &TypegraphLoaderConfig {
        self.typegraphs
            .loaders
            .get(&module_type)
            .unwrap_or(&DEFAULT_LOADER_CONFIG)
    }

    pub fn prisma_migrations_base_dir(&self, opt: PathOption) -> PathBuf {
        let path = self
            .typegraphs
            .materializers
            .prisma
            .migrations_path
            .as_deref()
            .unwrap_or_else(|| Path::new(DEFAULT_PRISMA_MIGRATIONS_PATH));

        match opt {
            PathOption::Absolute => self.base_dir.join(path),
            PathOption::Relative => path.to_path_buf(),
        }
    }

    /// `config migration dir` + `runtime` + `tg_name`
    pub fn prisma_migrations_dir_rel(&self, tg_name: &str) -> PathBuf {
        let mut path = self
            .typegraphs
            .materializers
            .prisma
            .migrations_path
            .as_deref()
            .unwrap_or_else(|| Path::new("prisma-migrations"))
            .to_path_buf();
        path.push(tg_name);
        path
    }

    /// canonical path to the migration given the typegraph path
    pub fn prisma_migration_dir_abs(&self, tg_name: &str) -> PathBuf {
        let mut path = self.base_dir.clone();
        path.push(self.prisma_migrations_dir_rel(tg_name));
        path
    }

    pub fn dir(&self) -> Result<&Path> {
        self.path
            .as_deref()
            .or(Some(self.base_dir.as_path()))
            .ok_or_else(|| ferr!("config path required"))?
            .parent()
            .ok_or_else(|| ferr!("config path has no parent"))
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
        let load_res = Config::load_or_find(Some(&path), project_root);
        assert_err_contains(load_res, "config file not found at");
        Ok(())
    }

    #[test]
    fn find_config_file() -> Result<()> {
        let project_root = get_project_root()?;
        let config =
            Config::load_or_find(None, project_root.join("src/meta-cli/tests/graphs/nested"));
        assert!(config.is_ok(), "{:?}", config);
        let config = config.unwrap();
        assert_eq!(config.base_dir, project_root.join("src/meta-cli/tests"));
        Ok(())
    }
}
