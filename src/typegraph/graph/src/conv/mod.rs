// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::VecDeque;

use crate::naming::NamingEngineFactory;
use crate::policies::{convert_policy, Policy};
use crate::runtimes::{convert_materializer, Materializer};
use crate::type_registry::TypeRegistryBuilder;
use crate::{interlude::*, Wrap as _};
use dedup::DupKeyGen;
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

pub fn convert<G, NF>(
    schema: Arc<tg_schema::Typegraph>,
    dup_key_gen: G,
    naming_engine_factory: NF,
) -> Result<crate::Typegraph<G::Key>>
where
    G: DupKeyGen,
    G::Key: Default,
    NF: NamingEngineFactory,
{
    let mut ne = naming_engine_factory.create();
    let registry = Registry::from(schema.as_ref());
    let mut map = ConversionMap::<G>::new(&schema);

    let mut conversion_steps: VecDeque<ConversionStep<G>> = Default::default();
    let mut link_steps: Vec<LinkStep<G>> = Default::default();

    conversion_steps.push_back(ConversionStep::root());

    while let Some(current_step) = conversion_steps.pop_front() {
        match current_step.plan(&map)? {
            StepPlan::Skip => continue,
            StepPlan::Create(key) => {
                let (result, map_item) =
                    current_step.convert(&schema, key, &dup_key_gen, &registry)?;
                map.merge_item(current_step.idx, map_item)?;
                conversion_steps.extend(result.next);
                link_steps.extend(result.link_step);
            }
        }
    }

    for link_step in link_steps.into_iter() {
        link_step.link(&map)?;
    }

    let root = {
        let map_item = map.direct.first().unwrap();
        match map_item {
            MapItem::Namespace(root, _) => root.clone(),
            _ => unreachable!(),
        }
    };

    let type_reg = TypeRegistryBuilder::new(&map).build(&root.clone().wrap())?;

    let name_registry = map.assign_names(&mut ne, &schema)?;

    Ok(crate::Typegraph {
        schema,
        root,
        input_types: type_reg.input_types,
        output_types: type_reg.output_types,
        functions: type_reg.functions,
        namespace_objects: type_reg.namespaces,
        named: name_registry.map,
        conversion_map: map.direct,
        runtimes: registry.runtimes,
        materializers: registry.materializers,
    })
}
