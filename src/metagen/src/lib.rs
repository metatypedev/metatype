// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
mod interlude {
    pub use common::typegraph::TypeNode;
    pub use common::typegraph::Typegraph;

    pub use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
    pub use std::ops::Deref;
    pub use std::path::{Path, PathBuf};
    pub use std::rc::Rc;
    pub use std::sync::Arc;

    pub use color_eyre::eyre::{
        self, self as anyhow, bail, ensure, format_err, ContextCompat, OptionExt, Result, WrapErr,
    };
    pub use futures_concurrency::prelude::*;
    pub use indexmap::IndexMap;
    pub use log::{debug, error, info, trace, warn};
    pub use pretty_assertions::assert_str_eq;
    pub use serde::{Deserialize, Serialize};
    #[cfg(test)]
    pub use tokio::process::Command;

    pub use crate::anyhow_to_eyre;
}

mod config;
mod macros;
mod shared;

mod fdk_python;
mod fdk_rust;
mod fdk_substantial;
mod fdk_typescript;

mod client_py;
mod client_rs;
mod client_ts;

#[cfg(test)]
mod tests;
mod utils;

use crate::interlude::*;

pub use config::*;
use futures_concurrency::future::FutureGroup;
pub use shared::FdkTemplate;

pub use fdk_python::DEFAULT_TEMPLATE as FDK_PYTHON_DEFAULT_TEMPLATE;
pub use fdk_rust::DEFAULT_TEMPLATE as FDK_RUST_DEFAULT_TEMPLATE;
pub use fdk_typescript::DEFAULT_TEMPLATE as FDK_TYPESCRIPT_DEFAULT_TEMPLATE;

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
    TypegraphFromTypegate { raw: Box<Typegraph> },
    TypegraphFromPath { raw: Box<Typegraph> },
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
pub struct GeneratorOutput(pub HashMap<PathBuf, GeneratedFile>);

/// The core trait any metagen generator modules will implement.
trait Plugin: Send + Sync {
    /// A list of inputs required by an implementatoin to do it's job.
    /// The [GeneratorInputOrder]s here will be resolved by the
    /// host's [InputResolver].
    fn bill_of_inputs(&self) -> HashMap<String, GeneratorInputOrder>;

    fn generate(
        &self,
        inputs: HashMap<String, GeneratorInputResolved>,
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
            static GENERATORS: HashMap<String, GeneratorRunner> = HashMap::from([
                // builtin generatorsFdkPythonGenConfig
                (
                    "fdk_rust".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_rust::FdkRustGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_rust::Generator::new(config)?;
                            Ok(Box::new(generator))
                        },
                    },
                ),
                (
                    "fdk_python".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_python::FdkPythonGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_python::Generator::new(config)?;
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
                    "fdk_typescript".to_string(),
                    GeneratorRunner {
                        op: |workspace_path: &Path, val| {
                            let config = fdk_typescript::FdkTypescriptGenConfig::from_json(val, workspace_path)?;
                            let generator = fdk_typescript::Generator::new(config)?;
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
    resolver: impl InputResolver + Send + Sync + Clone + 'static,
) -> anyhow::Result<GeneratorOutput> {
    use futures_lite::StreamExt;

    let target_conf = config
        .targets
        .get(target_name)
        .with_context(|| format!("target {target_name:?} not found in config"))?;

    let mut group = FutureGroup::new();
    for config in &target_conf.0 {
        let gen_name = &config.generator_name;
        let config = config.other.to_owned();
        let get_gen_op = GeneratorRunner::get(gen_name)
            .with_context(|| format!("generator \"{gen_name}\" not found in config"))?;

        let gen_impl = get_gen_op.exec(&workspace_path, config)?;
        let bill = gen_impl.bill_of_inputs();

        let mut resolve_group = FutureGroup::new();
        for (name, order) in bill.into_iter() {
            let resolver = resolver.clone();
            resolve_group.insert(Box::pin(async move {
                anyhow::Ok((name, resolver.resolve(order).await?))
            }));
        }

        let gen_name: Arc<str> = gen_name[..].into();
        group.insert(Box::pin(async move {
            let mut inputs = HashMap::new();
            while let Some(res) = resolve_group.next().await {
                let (name, input) = res?;
                inputs.insert(name, input);
            }
            let out = gen_impl.generate(inputs)?;
            anyhow::Ok((gen_name, out))
        }));
    }
    let mut out = HashMap::new();
    while let Some(res) = group.next().await {
        let (gen_name, files) = res?;
        for (path, buf) in files.0 {
            if let Some((src, _)) = out.get(&path) {
                anyhow::bail!("generators \"{src}\" and \"{gen_name}\" clashed at \"{path:?}\"");
            }
            out.insert(path, (gen_name.clone(), buf));
        }
    }
    let out: HashMap<PathBuf, GeneratedFile> = out
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
            let mut inputs = HashMap::new();
            for res in resolve_set {
                let (name, input) = res?;
                inputs.insert(name, input?);
            }
            let out = gen_impl.generate(inputs)?;
            Ok::<_, anyhow::Error>((gen_name, out))
        });
    }

    let mut out = HashMap::new();
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
