// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
mod interlude {
    pub use tg_schema::TypeNode;
    pub use tg_schema::Typegraph;

    pub use std::collections::{BTreeMap, BTreeSet};
    pub use std::ops::Deref;
    pub use std::path::{Path, PathBuf};
    pub use std::rc::Rc;
    pub use std::sync::Arc;

    pub use color_eyre::eyre::{
        self, self as anyhow, bail, ensure, format_err, ContextCompat, OptionExt, Result, WrapErr,
    };
    pub use futures_concurrency::prelude::*;
    pub use indexmap::{IndexMap, IndexSet};
    pub use log::{debug, error, info, trace, warn};
    pub use pretty_assertions::assert_str_eq;
    pub use serde::{Deserialize, Serialize};
    #[cfg(test)]
    pub use tokio::process::Command;

    pub use crate::anyhow_to_eyre;
}

mod config;
mod macros;
// used by the NamingPostProcessor
pub mod shared;

mod fdk_py;
mod fdk_rs;
mod fdk_substantial;
mod fdk_ts;

mod client_py;
mod client_rs;
mod client_ts;

#[cfg(test)]
mod tests;
mod utils;

use crate::interlude::*;

pub use config::*;
pub use shared::FdkTemplate;

pub use fdk_py::DEFAULT_TEMPLATE as FDK_PY_DEFAULT_TEMPLATE;
pub use fdk_rs::DEFAULT_TEMPLATE as FDK_RS_DEFAULT_TEMPLATE;
pub use fdk_ts::DEFAULT_TEMPLATE as FDK_TS_DEFAULT_TEMPLATE;

/// This implements a command object pattern API for generator
/// implementations to access the external world. See [InputResolver].
///
/// The rationale being that
/// - Ease of mocking for tests through [InputResolver] implementation.
/// - Ease of translating to wasm API for any future user implemented generators.
#[derive(Debug)]
pub enum GeneratorInputOrder {
    TypegraphFromTypegate {
        name: String,
    },
    TypegraphFromPath {
        path: PathBuf,
        name: Option<String>,
    },
    LoadFdkTemplate {
        default: &'static [(&'static str, &'static str)],
        override_path: Option<PathBuf>,
    },
}

/// Response types for the command object API implemented
/// by [GeneratorInputOrder].
#[derive(Debug)]
pub enum GeneratorInputResolved {
    TypegraphFromTypegate { raw: Arc<Typegraph> },
    TypegraphFromPath { raw: Arc<Typegraph> },
    FdkTemplate { template: FdkTemplate },
}

/// This type plays the "dispatcher" role to the command object
/// API implemented by [GeneratorInputOrder] and [GeneratorInputResolved].
pub trait InputResolver {
    fn resolve(
        &self,
        order: GeneratorInputOrder,
    ) -> impl std::future::Future<Output = anyhow::Result<GeneratorInputResolved>> + Send;
}

/// This type plays the "dispatcher" role to the command object
pub trait InputResolverSync {
    fn resolve(&self, order: GeneratorInputOrder) -> anyhow::Result<GeneratorInputResolved>;
}

#[derive(Debug)]
pub struct GeneratedFile {
    // pub path: PathBuf,
    pub contents: String,
    pub overwrite: bool,
}

#[derive(Debug)]
pub struct GeneratorOutput(pub IndexMap<PathBuf, GeneratedFile>);

/// The core trait any metagen generator modules will implement.
trait Plugin: Send + Sync {
    /// A list of inputs required by an implementatoin to do it's job.
    /// The [GeneratorInputOrder]s here will be resolved by the
    /// host's [InputResolver].
    fn bill_of_inputs(&self) -> IndexMap<String, GeneratorInputOrder>;

    fn generate(
        &self,
        inputs: IndexMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput>;
}

type PluginOutputResult = Result<Box<dyn Plugin>, anyhow::Error>;

#[derive(Clone)]
struct GeneratorRunner {
    op: fn(&Path, serde_json::Value) -> PluginOutputResult,
}

impl GeneratorRunner {
    pub fn exec(&self, workspace_path: &Path, value: serde_json::Value) -> PluginOutputResult {
        (self.op)(workspace_path, value)
    }
}

impl GeneratorRunner {
    pub fn get(name: &str) -> Option<GeneratorRunner> {
        thread_local! {
            static GENERATORS: IndexMap<String, GeneratorRunner> = IndexMap::from([
                // builtin generatorsFdkPythonGenConfig
                (
                    "fdk_rs".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_rs::FdkRustGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_rs::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "fdk_py".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_py::FdkPythonGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_py::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "fdk_substantial".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_substantial::FdkSubstantialGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_substantial::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "fdk_ts".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_ts::FdkTypescriptGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_ts::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "client_ts".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = client_ts::ClienTsGenConfig::from_json(val, workspace_path)?;
                            let generator = client_ts::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "client_py".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = client_py::ClienPyGenConfig::from_json(val, workspace_path)?;
                            let generator = client_py::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "client_rs".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = client_rs::ClienRsGenConfig::from_json(val, workspace_path)?;
                            let generator = client_rs::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
            ]);
        }

        GENERATORS.with(|m| m.get(name).cloned())
    }
}

pub async fn generate_target(
    config: &config::Config,
    target_name: &str,
    workspace_path: PathBuf,
    resolver: impl InputResolver + Send + Sync + 'static,
) -> anyhow::Result<GeneratorOutput> {
    let target_conf = config
        .targets
        .get(target_name)
        .with_context(|| format!("target {target_name:?} not found in config"))?;

    let mut out = IndexMap::new();

    for config in &target_conf.0 {
        let gen_name = &config.generator_name;
        let config = config.other.to_owned();
        let get_gen_op = GeneratorRunner::get(gen_name)
            .with_context(|| format!("generator \"{gen_name}\" not found in config"))?;

        let gen_impl = get_gen_op.exec(&workspace_path, config)?;
        let bill = gen_impl.bill_of_inputs();
        let gen_name: Arc<str> = gen_name[..].into();
        let mut inputs = IndexMap::new();

        for (name, order) in bill.into_iter() {
            let input = resolver.resolve(order).await?;
            inputs.insert(name, input);
        }

        let files = gen_impl.generate(inputs)?;

        for (path, buf) in files.0 {
            if let Some((src, _)) = out.get(&path) {
                anyhow::bail!("generators \"{src}\" and \"{gen_name}\" clashed at \"{path:?}\"");
            }
            out.insert(path, (gen_name.clone(), buf));
        }
    }
    let out: IndexMap<PathBuf, GeneratedFile> = out
        .into_iter()
        .map(|(path, (_, buf))| (path, buf))
        .collect();
    Ok(GeneratorOutput(out))
}

pub fn generate_target_sync(
    config: &config::Config,
    target_name: &str,
    workspace_path: PathBuf,
    resolver: impl InputResolverSync + Send + Sync + Clone + 'static,
) -> anyhow::Result<GeneratorOutput> {
    let target_conf = config
        .targets
        .get(target_name)
        .with_context(|| format!("target \"{target_name}\" not found in config"))?;

    let mut generate_set = vec![];
    for config in &target_conf.0 {
        let gen_name = &config.generator_name;
        let config = config.other.clone();

        let get_gen_op = GeneratorRunner::get(gen_name)
            .with_context(|| format!("generator \"{gen_name}\" not found in config"))?;

        let gen_impl = get_gen_op.exec(&workspace_path, config)?;
        let bill = gen_impl.bill_of_inputs();

        let resolve_set = bill.into_iter().map(|(name, order)| {
            let resolver = resolver.clone();
            Ok::<_, anyhow::Error>((name, resolver.resolve(order)))
        });

        let gen_name: Arc<str> = gen_name[..].into();
        generate_set.push(move || {
            let mut inputs = IndexMap::new();
            for res in resolve_set {
                let (name, input) = res?;
                inputs.insert(name, input?);
            }
            let out = gen_impl.generate(inputs)?;
            Ok::<_, anyhow::Error>((gen_name, out))
        });
    }

    let mut out = IndexMap::new();
    for res in generate_set {
        let (gen_name, files) = res()?;
        for (path, buf) in files.0 {
            if let Some((src, _)) = out.get(&path) {
                anyhow::bail!("generators \"{src}\" and \"{gen_name}\" clashed at \"{path:?}\"");
            }
            out.insert(path, (gen_name.clone(), buf));
        }
    }
    let out = out
        .into_iter()
        .map(|(path, (_, buf))| (path, buf))
        .collect();

    Ok(GeneratorOutput(out))
}
