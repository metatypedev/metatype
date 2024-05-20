// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
mod interlude {
    pub use common::typegraph::TypeNode;
    pub use common::typegraph::Typegraph;

    pub use std::collections::{HashMap, HashSet};
    pub use std::ops::Deref;
    pub use std::path::{Path, PathBuf};
    pub use std::sync::Arc;

    pub use color_eyre::eyre::{
        self as anyhow, bail, ensure, format_err, ContextCompat, OptionExt, Result, WrapErr,
    };
    pub use indexmap::IndexMap;
    pub use log::{debug, error, info, trace, warn};
    pub use pretty_assertions::assert_str_eq;
    pub use serde::{Deserialize, Serialize};
    #[cfg(test)]
    pub use tokio::process::Command;
}

mod config;
mod mdk;
mod mdk_rust;
#[cfg(test)]
mod tests;
mod utils;

use crate::interlude::*;

pub use config::*;

/// This implements a command object pattern API for generator
/// implemntations to access the external world. See [InputResolver].
///
/// The rationale being that
/// - Ease of mocking for tests through [InputResolver] implemntaiton.
/// - Ease of translating to wasm API for any future user implemented generators.
#[derive(Debug)]
pub enum GeneratorInputOrder {
    TypegraphFromTypegate { name: String },
    TypegraphFromPath { path: PathBuf, name: Option<String> },
}

/// Response types for the command object API implemented
/// by [GeneratorInputOrder].
#[derive(Debug)]
pub enum GeneratorInputResolved {
    TypegraphFromTypegate { raw: Typegraph },
    TypegraphFromPath { raw: Typegraph },
}

/// This type plays the "dispatcher" role to the command object
/// API implemented by [GeneratorInputOrder] and [GeneratorInputResolved].
pub trait InputResolver {
    fn resolve(
        &self,
        order: GeneratorInputOrder,
    ) -> impl std::future::Future<Output = anyhow::Result<GeneratorInputResolved>> + Send;
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

/// This function makes use of a JoinSet to process
/// items in parallel. This makes using actix workers in InputResolver
/// is a no no.
pub async fn generate_target(
    config: &config::Config,
    target_name: &str,
    workspace_path: PathBuf,
    resolver: impl InputResolver + Send + Sync + Clone + 'static,
) -> anyhow::Result<GeneratorOutput> {
    let generators = [
        // builtin generators
        (
            "mdk_rust".to_string(),
            // initialize the impl
            &|workspace_path: &Path, val| {
                let config = mdk_rust::MdkRustGenConfig::from_json(val, workspace_path)?;
                let generator = mdk_rust::Generator::new(config)?;
                Ok::<_, anyhow::Error>(Box::new(generator) as Box<dyn Plugin>)
            },
        ),
    ]
    .into_iter()
    .collect::<HashMap<String, _>>();

    let target_conf = config
        .targets
        .get(target_name)
        .with_context(|| format!("target {target_name:?} not found in config"))?;

    let mut generate_set = tokio::task::JoinSet::new();
    for (gen_name, config) in &target_conf.0 {
        let config = config.to_owned();

        let get_gen_fn = generators
            .get(&gen_name[..])
            .with_context(|| format!("generator {gen_name:?} not found in config"))?;

        let gen_impl = get_gen_fn(&workspace_path, config)?;
        let bill = gen_impl.bill_of_inputs();

        let mut resolve_set = tokio::task::JoinSet::new();
        for (name, order) in bill.into_iter() {
            let resolver = resolver.clone();
            _ = resolve_set.spawn(async move {
                Ok::<_, anyhow::Error>((name, resolver.resolve(order).await?))
            });
        }

        let gen_name: Arc<str> = gen_name[..].into();
        _ = generate_set.spawn(async move {
            let mut inputs = HashMap::new();
            while let Some(res) = resolve_set.join_next().await {
                let (name, input) = res??;
                inputs.insert(name, input);
            }
            let out = gen_impl.generate(inputs)?;
            Ok::<_, anyhow::Error>((gen_name, out))
        });
    }
    let mut out = HashMap::new();
    while let Some(res) = generate_set.join_next().await {
        let (gen_name, files) = res??;
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
