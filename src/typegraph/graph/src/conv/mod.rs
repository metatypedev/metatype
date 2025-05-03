// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::VecDeque;

use crate::naming::NamingEngine;
use crate::policies::{convert_policy, convert_policy_spec, Policy, PolicySpec};
use crate::runtimes::{convert_materializer, Materializer};
use crate::type_registry::TypeRegistryBuilder;
use crate::{interlude::*, Wrap as _};
use dedup::DuplicationKeyGenerator;
pub use map::{ConversionMap, MapItem, ValueType};
use step::ConversionStep;
use tg_schema::runtimes::TGRuntime;

pub mod dedup;
pub mod key;
pub mod map;
mod step;

pub mod interlude {
    pub use super::key::TypeKey;
    pub use super::step::LinkStep;
    pub use super::Conversion;
    pub use crate::path::{PathSegment, RelativePath};
}
use interlude::*;

#[derive(Default)]
pub struct Registry {
    pub runtimes: Vec<Arc<TGRuntime>>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,
}

/// Conversion state; used when converting a `tg_schema::Typegraph` into a `crate::Typegraph`
pub struct Conversion<G>
where
    G: DuplicationKeyGenerator,
{
    conversion_map: ConversionMap<G>,
    dup_key_gen: G,
    registry: Registry,
}

impl<G> Conversion<G>
where
    G: DuplicationKeyGenerator,
{
    fn new(schema: Arc<tg_schema::Typegraph>, dup_key_gen: G) -> Self {
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

        Conversion {
            conversion_map: ConversionMap::new(&schema),
            registry: Registry {
                runtimes,
                materializers,
                policies,
            },
            dup_key_gen,
        }
    }

    pub fn convert<NE>(
        schema: Arc<tg_schema::Typegraph>,
        dup_key_gen: G,
        naming_engine: NE,
    ) -> Result<crate::Typegraph<G::Key>>
    where
        NE: NamingEngine,
        G::Key: Default,
    {
        let mut conv = Conversion::new(schema.clone(), dup_key_gen);

        let mut conversion_steps: VecDeque<ConversionStep<G>> = Default::default();
        let mut link_steps: Vec<LinkStep<G>> = Default::default();

        conversion_steps.push_back(ConversionStep::root());

        while let Some(current_step) = conversion_steps.pop_front() {
            let result = current_step.convert(&schema, &mut conv)?;
            conversion_steps.extend(result.next);
            link_steps.extend(result.link_step);
        }

        for link_step in link_steps.into_iter() {
            link_step.link(&conv.conversion_map)?;
        }

        let root = {
            let map_item = conv.conversion_map.direct.first().unwrap();
            match map_item {
                MapItem::Namespace(root, _) => root.clone(),
                _ => unreachable!(),
            }
        };

        let mut ne = naming_engine;

        let type_reg =
            TypeRegistryBuilder::new(&conv.conversion_map).build(&root.clone().wrap())?;

        for idx in 0..schema.types.len() {
            let idx = idx as u32;
            match conv
                .conversion_map
                .direct
                .get(idx as usize)
                .unwrap_or(&MapItem::Unset)
            {
                MapItem::Unset => {
                    // It is possible that some types are not reachable from the root type of the
                    // typegraph.
                    // This is the case for the profiler functions and (eventually) its child
                    // types.
                }
                MapItem::Function(ty) => {
                    ne.name_function(ty)?;
                }
                MapItem::Namespace(ty, _) => {
                    ne.name_ns_object(ty)?;
                }
                MapItem::Value(vtypes) => {
                    ne.name_value_types(vtypes)?;
                }
            }
        }

        let reg = std::mem::take(ne.registry());

        Ok(crate::Typegraph {
            schema,
            root,
            input_types: type_reg.input_types,
            output_types: type_reg.output_types,
            functions: type_reg.functions,
            namespace_objects: type_reg.namespaces,
            named: reg.map,
            conversion_map: conv.conversion_map.direct,
            runtimes: conv.registry.runtimes,
            materializers: conv.registry.materializers,
        })
    }

    pub fn convert_policies(&self, policies: &[tg_schema::PolicyIndices]) -> Vec<PolicySpec> {
        policies
            .iter()
            .map(|pol| convert_policy_spec(&self.registry.policies, pol))
            .collect()
    }

    pub fn get_materializer(&self, idx: u32) -> Result<&Materializer> {
        self.registry
            .materializers
            .get(idx as usize)
            .ok_or_else(|| eyre!("materializer index out of bounds: {}", idx))
    }
}
