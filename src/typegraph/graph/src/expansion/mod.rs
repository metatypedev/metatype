// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::VecDeque;

use crate::engines::DuplicationEngineFactory;
use crate::engines::{DefaultDuplicationEngineFactory, DuplicationEngine};
use crate::engines::{DefaultNamingEngineFactory, NamingEngine, NamingEngineFactory};
use crate::interlude::*;
use crate::policies::{convert_policy, Policy};
use crate::runtimes::{convert_materializer, Materializer};
use crate::type_registry::TypeRegistryBuilder;
use crate::{Type, Wrap as _};
use indexmap::IndexMap;
pub use map::{ConversionMap, MapItem, ValueType};
use step::{ConversionStep, StepPlan};
use tg_schema::runtimes::TGRuntime;

pub mod map;
pub mod step;

pub mod interlude {
    pub use super::step::LinkStep;
    pub use crate::key::TypeKey;
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

#[derive(Clone)]
pub struct NoDuplication;
#[derive(Clone)]
pub struct NoNamingEngine;

#[derive(Clone)]
pub struct ExpansionConfig<D: Clone = NoDuplication, N: Clone = NoNamingEngine> {
    /// Conservative expansion will always convert original types even if they
    /// are not reachable from the root of the typegraph.
    /// (Original types are the versions that are not refined by injection or
    /// other parameters).
    conservative: bool,
    duplication_engine_factory: D,
    naming_engine_factory: N,
}

pub struct ExpansionConfigX<D: DuplicationEngine, N: NamingEngine> {
    conservative: bool,
    duplication_engine: D,
    naming_engine: N,
}

impl Default for ExpansionConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl ExpansionConfig {
    pub fn new() -> Self {
        Self {
            conservative: false,
            duplication_engine_factory: NoDuplication,
            naming_engine_factory: NoNamingEngine,
        }
    }

    pub fn with_default_engines(
    ) -> ExpansionConfig<DefaultDuplicationEngineFactory, DefaultNamingEngineFactory> {
        Self::new()
            .with_duplication(DefaultDuplicationEngineFactory)
            .with_naming_engine(DefaultNamingEngineFactory)
    }
}

impl<D, N> ExpansionConfig<D, N>
where
    D: Clone,
    N: Clone,
{
    /// Always convert original types even if they are not referenced in the typegraph.
    /// Original types are the types whose duplication key is default.
    pub fn conservative(mut self) -> Self {
        self.conservative = true;
        self
    }

    pub fn with_naming_engine<N2: NamingEngineFactory>(
        self,
        naming_engine_factory: N2,
    ) -> ExpansionConfig<D, N2> {
        ExpansionConfig {
            conservative: self.conservative,
            duplication_engine_factory: self.duplication_engine_factory,
            naming_engine_factory,
        }
    }

    pub fn with_duplication<D2: DuplicationEngineFactory>(
        self,
        duplication_engine_factory: D2,
    ) -> ExpansionConfig<D2, N> {
        ExpansionConfig {
            conservative: self.conservative,
            naming_engine_factory: self.naming_engine_factory,
            duplication_engine_factory,
        }
    }
}

impl<D, N> ExpansionConfig<D, N>
where
    D: DuplicationEngineFactory,
    N: NamingEngineFactory,
{
    pub fn expand<DE>(
        &self,
        schema: Arc<tg_schema::Typegraph>,
    ) -> Result<Arc<crate::Typegraph<DE::Key>>>
    where
        D: DuplicationEngineFactory<Engine = DE>,
        DE: DuplicationEngine,
        DE::Key: Default,
    {
        let duplication_engine = self.duplication_engine_factory.create(schema.clone());
        let naming_engine = self.naming_engine_factory.create();
        let config = ExpansionConfigX {
            conservative: self.conservative,
            duplication_engine,
            naming_engine,
        };
        let mut expansion = TypegraphExpansion::new(config, schema);
        expansion.run()
    }
}

pub struct TypegraphExpansion<D: DuplicationEngine, N: NamingEngine> {
    config: ExpansionConfigX<D, N>,
    schema: Arc<tg_schema::Typegraph>,
    registry: Registry,
    conversion_map: ConversionMap<D>,
    conversion_steps: VecDeque<ConversionStep<D>>,
    link_steps: Vec<LinkStep<D>>,
    disconnected_types: IndexMap<u32, Type>,
    converting_disconnected_types: bool,
}

impl<D: DuplicationEngine, N: NamingEngine> TypegraphExpansion<D, N>
where
    D::Key: Default,
{
    fn new(config: ExpansionConfigX<D, N>, schema: Arc<tg_schema::Typegraph>) -> Self {
        let registry = Registry::from(schema.as_ref());
        let conversion_map = ConversionMap::<D>::new(&schema);
        Self {
            config,
            schema,
            registry,
            conversion_map,
            conversion_steps: Default::default(),
            link_steps: Default::default(),
            disconnected_types: Default::default(),
            converting_disconnected_types: false,
        }
    }

    fn run(&mut self) -> Result<Arc<crate::Typegraph<D::Key>>> {
        tracing::info!("starting typegraph expansion");
        #[cfg(debug_assertions)]
        let start_time = std::time::Instant::now();
        self.conversion_steps.push_back(ConversionStep::root());

        while self.run_conversion_steps()? {
            self.run_link_steps()?;

            if self.config.conservative {
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
            .assign_names(&mut self.config.naming_engine, &self.schema)?;

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
                        &self.config.duplication_engine,
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
