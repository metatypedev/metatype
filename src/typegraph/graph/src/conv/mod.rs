// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::VecDeque;

use crate::naming::{DefaultNamingEngineFactory, NamingEngine, NamingEngineFactory};
use crate::policies::{convert_policy, Policy};
use crate::runtimes::{convert_materializer, Materializer};
use crate::type_registry::TypeRegistryBuilder;
use crate::{interlude::*, Type, Wrap as _};
use dedup::{DefaultDuplicationKey, DefaultDuplicationKeyGenerator, DupKeyGen};
use indexmap::IndexMap;
pub use map::{ConversionMap, MapItem, ValueType};
use step::{ConversionStep, StepPlan};
use tg_schema::runtimes::TGRuntime;

pub mod dedup;
pub mod key;
pub mod map;
mod step;

pub mod interlude {
    pub use super::key::TypeKey;
    pub use super::step::LinkStep;
    pub use crate::path::{PathSegment, RelativePath};
}
use interlude::*;

#[derive(Default)]
pub struct Registry {
    pub runtimes: Vec<Arc<TGRuntime>>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,
}

impl From<&tg_schema::Typegraph> for Registry {
    fn from(schema: &tg_schema::Typegraph) -> Self {
        let runtimes: Vec<_> = schema.runtimes.iter().map(|rt| rt.clone().into()).collect();
        let materializers: Vec<_> = schema
            .materializers
            .iter()
            .map(|mat| convert_materializer(&runtimes, mat))
            .collect();

        let policies = schema
            .policies
            .iter()
            .map(|pol| convert_policy(&materializers, pol))
            .collect();
        Self {
            runtimes,
            materializers,
            policies,
        }
    }
}

#[derive(Default, Clone)]
pub struct TypegraphExpansionConfig {
    original: bool,
}

impl TypegraphExpansionConfig {
    /// Always convert original types even if they are not referenced in the typegraph.
    /// Original types are the types whose duplication key is default.
    pub fn always_convert_original(mut self) -> Self {
        self.original = true;
        self
    }

    pub fn expand_with_default_params(
        &self,
        schema: Arc<tg_schema::Typegraph>,
    ) -> Result<Arc<crate::Typegraph<DefaultDuplicationKey>>> {
        let dup_key_gen = DefaultDuplicationKeyGenerator {
            schema: schema.clone(),
        };
        self.expand(schema, dup_key_gen, DefaultNamingEngineFactory)
    }

    pub fn expand<G, NF>(
        &self,
        schema: Arc<tg_schema::Typegraph>,
        dup_key_gen: G,
        naming_engine_factory: NF,
    ) -> Result<Arc<crate::Typegraph<G::Key>>>
    where
        G: DupKeyGen,
        G::Key: Default,
        NF: NamingEngineFactory,
    {
        let naming_engine = naming_engine_factory.create();
        let mut expansion =
            TypegraphExpansion::new(self.clone(), schema, dup_key_gen, naming_engine);
        expansion.run()
    }
}

pub struct TypegraphExpansion<G: DupKeyGen, NE: NamingEngine> {
    config: TypegraphExpansionConfig,
    schema: Arc<tg_schema::Typegraph>,
    registry: Registry,
    dup_key_gen: G,
    naming_engine: NE,
    conversion_map: ConversionMap<G>,
    conversion_steps: VecDeque<ConversionStep<G>>,
    link_steps: Vec<LinkStep<G>>,
    disconnected_types: IndexMap<u32, Type>,
    converting_disconnected_types: bool,
}

impl<G: DupKeyGen, NE: NamingEngine> TypegraphExpansion<G, NE>
where
    G::Key: Default,
{
    fn new(
        config: TypegraphExpansionConfig,
        schema: Arc<tg_schema::Typegraph>,
        dup_key_gen: G,
        naming_engine: NE,
    ) -> Self {
        let registry = Registry::from(schema.as_ref());
        let conversion_map = ConversionMap::<G>::new(&schema);
        Self {
            config,
            schema,
            registry,
            dup_key_gen,
            naming_engine,
            conversion_map,
            conversion_steps: Default::default(),
            link_steps: Default::default(),
            disconnected_types: Default::default(),
            converting_disconnected_types: false,
        }
    }

    fn run(&mut self) -> Result<Arc<crate::Typegraph<G::Key>>> {
        tracing::info!("starting typegraph expansion");
        #[cfg(debug_assertions)]
        let start_time = std::time::Instant::now();
        self.conversion_steps.push_back(ConversionStep::root());

        while self.run_conversion_steps()? {
            self.run_link_steps()?;

            if self.config.original {
                for (idx, map_item) in self.conversion_map.direct.iter().enumerate() {
                    if let MapItem::Value(vtype) = map_item {
                        if vtype.default.is_none() {
                            self.conversion_steps
                                .push_back(ConversionStep::disconnected(idx as u32))
                        }
                    }
                }
                self.converting_disconnected_types = true;
            }
        }

        let root = {
            let map_item = self.conversion_map.direct.first().unwrap();
            match map_item {
                MapItem::Namespace(root, _) => root.clone(),
                _ => unreachable!(),
            }
        };

        let type_reg =
            TypeRegistryBuilder::new(&self.conversion_map).build(&root.clone().wrap())?;

        let name_registry = self
            .conversion_map
            .assign_names(&mut self.naming_engine, &self.schema)?;

        let conversion_map = std::mem::take(&mut self.conversion_map).direct;
        let registry = std::mem::take(&mut self.registry);

        tracing::info!("typegraph successfully expanded");
        #[cfg(debug_assertions)]
        {
            let end_time = std::time::Instant::now();
            let duration = end_time.duration_since(start_time);
            tracing::debug!(
                "typegraph expansion took {} milliseconds",
                duration.as_millis(),
            )
        }

        Ok(crate::Typegraph {
            schema: self.schema.clone(),
            root,
            input_types: type_reg.input_types,
            output_types: type_reg.output_types,
            functions: type_reg.functions,
            namespace_objects: type_reg.namespaces,
            disconnected_types: std::mem::take(&mut self.disconnected_types),
            named: name_registry.map,
            conversion_map,
            runtimes: registry.runtimes,
            materializers: registry.materializers,
        }
        .into())
    }

    fn run_conversion_steps(&mut self) -> Result<bool> {
        if self.conversion_steps.is_empty() {
            return Ok(false);
        }

        while let Some(current_step) = self.conversion_steps.pop_front() {
            match current_step.plan(&self.conversion_map)? {
                StepPlan::Skip => (),
                StepPlan::Create(key) => {
                    let (result, map_item) = current_step.convert(
                        &self.schema,
                        key,
                        &self.dup_key_gen,
                        &self.registry,
                    )?;
                    if self.converting_disconnected_types {
                        self.disconnected_types.insert(key.0, result.ty.clone());
                    }
                    self.conversion_map.merge_item(current_step.idx, map_item)?;
                    self.conversion_steps.extend(result.next);
                    self.link_steps.extend(result.link_step);
                }
            }
        }

        Ok(true)
    }

    fn run_link_steps(&mut self) -> Result<()> {
        for link_step in std::mem::take(&mut self.link_steps).into_iter() {
            link_step.link(&self.conversion_map)?;
        }

        Ok(())
    }
}
