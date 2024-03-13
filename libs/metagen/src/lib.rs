// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

#[allow(unused)]
mod interlude {
    pub use common::typegraph::TypeNode;
    pub use common::typegraph::Typegraph;

    pub use std::collections::{HashMap, HashSet};
    pub use std::ops::Deref;
    pub use std::path::{Path, PathBuf};
    pub use std::sync::Arc;

    pub use anyhow::Context;
    pub use indexmap::IndexMap;
    pub use log::{debug, error, info, trace, warn};
    pub use serde::{Deserialize, Serialize};
}

mod config;
mod mdk_rust;
mod utils;

use common::typegraph::{runtimes::TGRuntime, Materializer};

use crate::interlude::*;

#[derive(Debug)]
pub enum GeneratorInputOrder {
    TypegraphDesc { name: String },
}

#[derive(Debug)]
pub enum GeneratorInputResolved {
    TypegraphDesc { raw: Typegraph },
}

pub trait InputResolver {
    fn resolve(
        &self,
        order: GeneratorInputOrder,
    ) -> impl std::future::Future<Output = anyhow::Result<GeneratorInputResolved>> + Send;
}

#[derive(Debug)]
pub struct GeneratorOutput(pub HashMap<PathBuf, String>);

impl InputResolver for Ctx {
    async fn resolve(&self, order: GeneratorInputOrder) -> anyhow::Result<GeneratorInputResolved> {
        Ok(match order {
            GeneratorInputOrder::TypegraphDesc { name } => GeneratorInputResolved::TypegraphDesc {
                raw: self
                    .typegate
                    .typegraph(&name)
                    .await?
                    .with_context(|| format!("no typegraph found under \"{name}\""))?,
            },
        })
    }
}

trait Plugin: Send + Sync {
    fn bill_of_inputs(&self) -> HashMap<String, GeneratorInputOrder>;
    fn generate(
        &self,
        inputs: HashMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput>;
}

#[derive(Clone, Debug)]
struct TypeDescRef {
    inner: Arc<TypeDesc>,
    cyclic: bool,
}

impl TypeDescRef {
    pub fn cyclic(&self) -> bool {
        self.cyclic
    }
}

impl Deref for TypeDescRef {
    type Target = TypeDesc;

    fn deref(&self) -> &Self::Target {
        self.inner.deref()
    }
}

#[derive(Debug)]
enum TypeDesc {
    Default {
        id: u32,
        node: TypeNode,
    },
    Union {
        id: u32,
        node: TypeNode,
        any_of: Vec<TypeDescRef>,
    },
    Either {
        id: u32,
        node: TypeNode,
        one_of: Vec<TypeDescRef>,
    },
    List {
        id: u32,
        is_set: bool,
        node: TypeNode,
        items: TypeDescRef,
    },
    Object {
        id: u32,
        node: TypeNode,
        /// The bool designates weather or not the field is required
        props: IndexMap<String, (TypeDescRef, bool)>,
    },
    Optional {
        id: u32,
        node: TypeNode,
        item: TypeDescRef,
    },
    Function {
        id: u32,
        node: TypeNode,
        input: TypeDescRef,
        output: TypeDescRef,
    },
}

impl TypeDesc {
    /// Returns `true` if the type desc is [`Function`].
    ///
    /// [`Function`]: TypeDesc::Function
    #[must_use]
    pub fn is_function(&self) -> bool {
        matches!(self, Self::Function { .. })
    }
}

fn nodes_to_desc(nodes: &[TypeNode]) -> anyhow::Result<HashMap<u32, Arc<TypeDesc>>> {
    use TypeNode::*;
    // due to recurring stack overflows, this function is implemented
    // iteratively instead of recursively.
    // A queue is used where items who's deps are still pending
    // req-que to the back
    let mut out: HashMap<u32, Arc<TypeDesc>> = Default::default();
    let mut indies = vec![];
    let mut dep_edges_simple = HashMap::<u32, Vec<u32>>::new();
    for (id, node) in nodes.iter().enumerate() {
        let id = id as u32;
        match node {
            Optional { data, .. } => {
                dep_edges_simple.insert(id, vec![data.item]);
            }
            Union { data, .. } => {
                dep_edges_simple.insert(id, data.any_of.clone());
            }
            Either { data, .. } => {
                dep_edges_simple.insert(id, data.one_of.clone());
            }
            Object { data, .. } => {
                dep_edges_simple.insert(id, data.properties.values().cloned().collect());
            }
            List { data, .. } => {
                dep_edges_simple.insert(id, vec![data.items]);
            }
            Function { data, .. } => {
                dep_edges_simple.insert(id, vec![data.input, data.output]);
            }
            _ => indies.push(id),
        }
    }
    fn test_cycle(id: u32, dep_id: u32, dep_edges: &HashMap<u32, Vec<u32>>) -> Option<u32> {
        if let Some(dep_deps) = dep_edges.get(&dep_id) {
            for &dep_dep_id in dep_deps {
                if id == dep_dep_id {
                    return Some(dep_dep_id);
                }
                if let Some(hit) = test_cycle(id, dep_dep_id, dep_edges) {
                    return Some(hit);
                }
            }
        }
        None
    }
    let mut rev_dep_edges = HashMap::<u32, Vec<(u32, bool)>>::new();
    let mut dep_edges = HashMap::<u32, Vec<(u32, bool)>>::new();
    for (&id, cur_dep_edges) in &dep_edges_simple {
        let mut full_dep_edges = Vec::with_capacity(cur_dep_edges.len());
        for &dep_id in cur_dep_edges {
            assert_ne!(id, dep_id);
            let cycle = test_cycle(id, dep_id, &dep_edges_simple);
            rev_dep_edges
                .entry(dep_id)
                .or_default()
                .push((id, cycle.is_some()));
            full_dep_edges.push((dep_id, cycle.is_some()));
        }
        dep_edges.insert(id, full_dep_edges);
    }
    let mut working_set = indies;
    while let Some(id) = working_set.pop() {
        let node = &nodes[id as usize];
        let desc = match node {
            Optional { data, .. } => TypeDesc::Optional {
                id,
                node: node.clone(),
                item: out
                    .get(&data.item)
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .unwrap(),
            },
            Union { data, .. } => TypeDesc::Union {
                id,
                node: node.clone(),
                any_of: data
                    .any_of
                    .iter()
                    .map(|id| out.get(&id).unwrap())
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .collect(),
            },
            Either { data, .. } => TypeDesc::Either {
                id,
                node: node.clone(),
                one_of: data
                    .one_of
                    .iter()
                    .map(|id| out.get(&id).unwrap())
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .collect(),
            },
            Object { data, .. } => TypeDesc::Object {
                id,
                node: node.clone(),
                props: data
                    .properties
                    .iter()
                    .map(|(key, val)| {
                        (
                            key.clone(),
                            (
                                TypeDescRef {
                                    inner: out.get(val).unwrap().clone(),
                                    cyclic: false,
                                },
                                data.required.contains(key),
                            ),
                        )
                    })
                    .collect::<IndexMap<_, _>>(),
            },
            List { data, .. } => TypeDesc::List {
                id,
                is_set: data.unique_items.unwrap_or_default(),
                node: node.clone(),
                items: out
                    .get(&data.items)
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .unwrap(),
            },
            Function { data, .. } => TypeDesc::Function {
                id,
                node: node.clone(),
                input: out
                    .get(&data.input)
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .unwrap(),
                output: out
                    .get(&data.input)
                    .cloned()
                    .map(|inner| TypeDescRef {
                        inner,
                        cyclic: false,
                    })
                    .unwrap(),
            },
            _ => TypeDesc::Default {
                id,
                node: node.clone(),
            },
        };
        let desc = Arc::new(desc);
        out.insert(id, desc.clone());
        if let Some(rev_deps) = rev_dep_edges.remove(&id) {
            for (rev_dep_id, cycle) in rev_deps {
                let remaining_deps = dep_edges_simple.get_mut(&rev_dep_id).unwrap();
                remaining_deps
                    .swap_remove(remaining_deps.iter().position(|idx| *idx == id).unwrap());
                if remaining_deps.is_empty() {
                    dep_edges_simple.remove(&rev_dep_id);
                    working_set.push(rev_dep_id);
                }
            }
        }
    }
    Ok(out)
}

struct StubbedFunction {
    pub id: u32,
    pub node: TypeNode,
    pub mat: Materializer,
    pub runtime: Arc<TGRuntime>,
}

fn get_stubbed_funcs(
    tg: &Typegraph,
    stubbed_runtimes: &[String],
) -> anyhow::Result<Vec<StubbedFunction>> {
    let stubbed_runtimes = stubbed_runtimes
        .iter()
        .map(|rt_name| {
            tg.runtimes
                .iter()
                .position(|rt| rt_name == rt.name())
                .map(|idx| (idx as u32, Arc::new(tg.runtimes[idx].clone())))
                .with_context(|| format!("runtime {rt_name} not found"))
        })
        .collect::<Result<HashMap<_, _>, _>>()?;
    let stubbed_materializers = tg
        .materializers
        .iter()
        .enumerate()
        // TODO: consider filtering out non "function" mats
        .filter(|(_, mat)| stubbed_runtimes.contains_key(&mat.runtime))
        .map(|(id, _)| id as u32)
        .collect::<HashSet<_>>();
    let stubbed_funcs = tg
        .types
        .iter()
        .enumerate()
        .filter_map(|(id, node)| match node {
            TypeNode::Function { data, .. }
                if stubbed_materializers.contains(&data.materializer) =>
            {
                let mat = tg.materializers[data.materializer as usize].clone();
                Some(StubbedFunction {
                    id: id as _,
                    node: node.clone(),
                    runtime: stubbed_runtimes.get(&mat.runtime).unwrap().clone(),
                    mat,
                })
            }
            _ => None,
        })
        .collect();
    Ok(stubbed_funcs)
}

#[derive(Clone)]
struct Ctx {
    typegate: Arc<common::node::Node>,
}

pub async fn generate_target(
    config: &config::Config,
    target_name: &str,
    resolver: impl InputResolver + Send + Sync + Clone + 'static,
) -> anyhow::Result<HashMap<PathBuf, String>> {
    let generators = [
        // builtin generators
        (
            "mdk_rust".to_string(),
            // initialize the impl
            &|val| {
                let config: mdk_rust::MdkRustGenConfig = serde_json::from_value(val)?;
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
        .with_context(|| format!("target \"{target_name}\" not found in config"))?;

    let mut generate_set = tokio::task::JoinSet::new();
    for (gen_name, config) in &target_conf.0 {
        let config = config.to_owned();

        let get_gen_fn = generators
            .get(&gen_name[..])
            .with_context(|| format!("generator \"{gen_name}\" not found in config"))?;

        let gen_impl = get_gen_fn(config)?;
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
    Ok(out)
}

#[test]
#[ignore]
fn e2e() -> anyhow::Result<()> {
    let tg_name = "roadmap-reduce";
    let config = config::Config {
        targets: [(
            "default".to_string(),
            config::Target(
                [(
                    "mdk_rust".to_string(),
                    serde_json::to_value(mdk_rust::MdkRustGenConfig {
                        stubbed_runtimes: None,
                        base: config::MdkGeneratorConfigBase {
                            typegraph: tg_name.into(),
                            path: "/tmp/test".into(),
                        },
                    })?,
                )]
                .into_iter()
                .collect(),
            ),
        )]
        .into_iter()
        .collect(),
    };
    let cx = Ctx {
        typegate: Arc::new(common::node::Node::new(
            "http://localhost:7890",
            None,
            Some(common::node::BasicAuth {
                username: "admin".into(),
                password: "password".into(),
            }),
            Default::default(),
        )?),
    };
    let out = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_stack_size(16 * 1024 * 1024)
        .build()?
        .block_on(generate_target(&config, "default", cx))?;
    dbg!(out);
    Ok(())
}
