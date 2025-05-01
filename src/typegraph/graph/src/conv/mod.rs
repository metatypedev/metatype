// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::VecDeque;

use crate::naming::NamingEngine;
use crate::policies::{convert_policy, convert_policy_spec, Policy, PolicySpec};
use crate::runtimes::{convert_materializer, Materializer};
use crate::type_registry::TypeRegistryBuilder;
use crate::Type;
use crate::{interlude::*, Wrap as _};
use dedup::DuplicationKeyGenerator;
use indexmap::IndexMap;
pub use map::{ConversionMap, MapItem, MapValueItem, ValueType};
use step::ConversionStep;
use tg_schema::runtimes::TGRuntime;

pub mod dedup;
pub mod key;
pub mod map;
mod step;

pub mod interlude {
    pub use super::key::TypeKey;
    pub use super::step::LinkStep;
    pub use super::{Conversion, TypeConversionResult};
    pub use crate::path::{PathSegment, RelativePath};
}
use interlude::*;

/// Conversion state; used when converting a `tg_schema::Typegraph` into a `crate::Typegraph`
pub struct Conversion<G>
where
    G: DuplicationKeyGenerator,
{
    schema: Arc<tg_schema::Typegraph>,
    conversion_map: ConversionMap<G>,
    dup_key_gen: G,
    // types: TypeRegistry,
    secondary_registry: SecondaryRegistry,
}

// #[derive(Default)]
// struct TypeRegistry {
//     input_types: IndexMap<TypeKey, Type>,
//     output_types: IndexMap<TypeKey, Type>,
//     functions: IndexMap<u32, Arc<FunctionType>>,
//     namespace_objects: IndexMap<Vec<Arc<str>>, Arc<ObjectType>>,
// }

#[derive(Default)]
pub struct SecondaryRegistry {
    pub runtimes: Vec<Arc<TGRuntime>>,
    pub materializers: Vec<Materializer>,
    pub policies: Vec<Policy>,
}

pub trait TypeConversionResult<G: DuplicationKeyGenerator> {
    fn get_type(&self) -> Type;
    /// convert children
    fn finalize(&mut self, conv: &mut Conversion<G>) -> Result<()>
    where
        G: DuplicationKeyGenerator;
}

// // Type conversion that does not need propagation; cached or no children
// struct FinalizedTypeConversion(Type);
//
// fn finalized_type<DKG: DuplicationKeyGenerator>(ty: Type) -> Box<dyn TypeConversionResult<DKG>> {
//     Box::new(FinalizedTypeConversion(ty))
// }
//
// impl<DKG: DuplicationKeyGenerator> TypeConversionResult<DKG> for FinalizedTypeConversion {
//     fn get_type(&self) -> Type {
//         self.0.clone()
//     }
//
//     fn finalize(&mut self, _conv: &mut Conversion<DKG>) -> Result<()>
//     where
//         DKG: DuplicationKeyGenerator,
//     {
//         // nothing to do
//         Ok(())
//     }
// }

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
            schema: schema.clone(),
            conversion_map: ConversionMap::new(&schema, &dup_key_gen),
            secondary_registry: SecondaryRegistry {
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
        eprintln!("starting conversion");

        let mut conversion_steps: VecDeque<ConversionStep<G>> = Default::default();
        let mut link_steps: Vec<LinkStep<G>> = Default::default();

        conversion_steps.push_back(ConversionStep::root());

        while let Some(current_step) = conversion_steps.pop_front() {
            eprintln!(
                "step: {}; queue_size: {}; rpath: {:?}",
                current_step.idx(),
                conversion_steps.len(),
                current_step.rpath,
            );
            let result = current_step.convert(&schema, &mut conv)?;
            eprintln!(
                "    > next: {:?}",
                result.next.iter().map(|s| &s.rpath).collect::<Vec<_>>()
            );
            conversion_steps.extend(result.next);
            link_steps.extend(result.link_step);
        }

        for link_step in link_steps.into_iter() {
            link_step.link(&conv.conversion_map)?;
        }

        let root = {
            let map_item = conv.conversion_map.direct.get(0).unwrap();
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
                    bail!("no type for type idx: {}", idx);
                }
                MapItem::Function(ty) => {
                    eprintln!("#{idx} function");
                    ne.name_function(ty)?;
                    // functions.insert(idx, ty.clone());
                }
                MapItem::Namespace(ty, path) => {
                    eprintln!("#{idx} namespace");
                    ne.name_ns_object(ty)?;
                    // namespaces.insert(path.clone(), ty.clone());
                }
                MapItem::Value(vtypes) => {
                    ne.name_value_types(vtypes)?;
                    // for (key, i) in vtypes.iter(idx as u32) {
                    //     let (input, output) = i.branches();
                    //     eprintln!("{key:?} input={input} output={output}");
                    //     if input {
                    //         input_types.insert(key, i.ty.clone());
                    //     }
                    //     if output {
                    //         output_types.insert(key, i.ty.clone());
                    //     }
                    // }
                }
            }
        }

        let reg = std::mem::take(ne.registry());

        eprintln!("<<< finalizing conversion");
        eprintln!(
            "input_types: {}; output_types: {}",
            type_reg.input_types.len(),
            type_reg.output_types.len()
        );
        Ok(crate::Typegraph {
            schema,
            root,
            input_types: type_reg.input_types,
            output_types: type_reg.output_types,
            functions: type_reg.functions,
            namespace_objects: type_reg.namespaces,
            named: reg.map,
            conversion_map: conv
                .conversion_map
                .direct
                .into_iter()
                .map(TryFrom::try_from)
                .collect::<Result<Vec<_>>>()?,
            runtimes: conv.secondary_registry.runtimes,
            materializers: conv.secondary_registry.materializers,
        })
    }

    // fn register_converted_type(
    //     &mut self,
    //     rpath: RelativePath,
    //     ty: Type,
    //     duplicate: bool, // -> recursive
    // ) -> Result<()> {
    //     if !duplicate {
    //         self.conversion_map.register(rpath.clone(), ty.clone())?;
    //         // recursivity will be handled by the finalizer
    //     } else if !matches!(ty, Type::Function(_)) {
    //         // value type
    //
    //         let added = self.conversion_map.append(ty.key(), rpath.clone())?;
    //         if added {
    //             let cyclic = self
    //                 .dup_key_gen
    //                 .find_type_in_rpath(&ty, &rpath.pop(), &self.schema);
    //             if !cyclic {
    //                 for edge in ty.edges() {
    //                     let child_ty = edge.to;
    //                     if let Ok(seg) = edge.kind.try_into() {
    //                         self.register_converted_type(rpath.push(seg)?, child_ty, true)?;
    //                     }
    //                 }
    //             }
    //         }
    //     }
    //
    //     use RelativePath as RP;
    //     match rpath {
    //         RP::Function(fn_idx) => {
    //             self.functions.insert(fn_idx, ty.assert_func()?.clone());
    //         }
    //         RP::NsObject(path) => {
    //             self.namespace_objects
    //                 .insert(path.clone(), ty.assert_object()?.clone());
    //         }
    //         RP::Input(_) => {
    //             self.input_types.insert(ty.key(), ty.clone());
    //         }
    //         RP::Output(_) => {
    //             self.output_types.insert(ty.key(), ty.clone());
    //         }
    //     }
    //
    //     Ok(())
    // }
    //
    // fn register_type<C: FnOnce() -> Box<dyn TypeConversionResult<G>>>(
    //     &mut self,
    //     rpath: RelativePath,
    //     convert: C,
    //     duplicate: bool,
    // ) -> Result<Box<dyn TypeConversionResult<G>>> {
    //     // TODO
    //     let conv_res = convert();
    //     let typ = conv_res.get_type();
    //
    //     self.register_converted_type(rpath.clone(), typ.clone(), duplicate)?;
    //
    //     Ok(conv_res)
    // }
    //
    // fn register_finalized_type(
    //     &mut self,
    //     rpath: RelativePath,
    //     ty: Type,
    // ) -> Result<Box<dyn TypeConversionResult<G>>> {
    //     self.register_converted_type(rpath, ty.clone(), false)?;
    //     Ok(finalized_type(ty))
    // }
    //
    // pub fn convert_type(
    //     &mut self,
    //     parent: WeakType,
    //     idx: u32,
    //     rpath: RelativePath,
    // ) -> Result<Box<dyn TypeConversionResult<G>>> {
    //     let schema = self.schema.clone();
    //     let type_node = &schema.types[idx as usize];
    //     use tg_schema::TypeNode as N;
    //
    //     let dkey = self.dup_key_gen.gen_from_rpath(&rpath);
    //
    //     // let dkey = if !schema.is_function(ty.idx) && schema.is_composite(ty.idx) {
    //     //     DuplicationKey::from_rpath(&rpath)
    //     // } else {
    //     //     // currently, we only generate a single type from each scalar type node
    //     //     Default::default()
    //     // };
    //     let key = match self.conversion_map.deduplicate(idx, &dkey)? {
    //         Deduplication::Reuse(typ) => {
    //             // TODO rename to: register_duplicate
    //             return self.register_type(rpath.clone(), || finalized_type(typ), true);
    //         }
    //         Deduplication::Register(tkey) => tkey,
    //     };
    //
    //     let gen_base = {
    //         let rpath = rpath.clone();
    //         move |base: &tg_schema::TypeNodeBase| TypeBase::new(base, parent, key, &rpath)
    //     };
    //
    //     match type_node {
    //         N::Boolean { base } => self.register_finalized_type(
    //             rpath,
    //             Type::Boolean(
    //                 BooleanType {
    //                     base: gen_base(base),
    //                 }
    //                 .into(),
    //             ),
    //         ),
    //         N::Integer { base, data } => self.register_finalized_type(
    //             rpath,
    //             Type::Integer(
    //                 IntegerType {
    //                     base: gen_base(base),
    //                     minimum: data.minimum,
    //                     maximum: data.maximum,
    //                     exclusive_minimum: data.exclusive_minimum,
    //                     exclusive_maximum: data.exclusive_maximum,
    //                     multiple_of: data.multiple_of,
    //                 }
    //                 .into(),
    //             ),
    //         ),
    //         N::Float { base, data } => self.register_finalized_type(
    //             rpath,
    //             Type::Float(
    //                 crate::FloatType {
    //                     base: gen_base(base),
    //                     minimum: data.minimum,
    //                     maximum: data.maximum,
    //                     exclusive_minimum: data.exclusive_minimum,
    //                     exclusive_maximum: data.exclusive_maximum,
    //                     multiple_of: data.multiple_of,
    //                 }
    //                 .into(),
    //             ),
    //         ),
    //         N::String { base, data } => self.register_finalized_type(
    //             rpath,
    //             Type::String(
    //                 crate::StringType {
    //                     base: gen_base(base),
    //                     pattern: data.pattern.clone(),
    //                     format: data.format.clone(),
    //                     min_length: data.min_length,
    //                     max_length: data.max_length,
    //                     enumeration: base.enumeration.clone(),
    //                 }
    //                 .into(),
    //             ),
    //         ),
    //         N::File { base, data } => self.register_finalized_type(
    //             rpath,
    //             Type::File(
    //                 crate::FileType {
    //                     base: gen_base(base),
    //                     min_size: data.min_size,
    //                     max_size: data.max_size,
    //                     mime_types: data.mime_types.clone(),
    //                 }
    //                 .into(),
    //             ),
    //         ),
    //         N::Optional { base, data } => self.register_type(
    //             rpath.clone(),
    //             move || convert_optional(gen_base(base), data, &rpath),
    //             false,
    //         ),
    //         N::List { base, data } => self.register_type(
    //             rpath.clone(),
    //             || convert_list(gen_base(base), data, rpath.clone()),
    //             false,
    //         ),
    //         N::Object { base, data } => self.register_type(
    //             rpath.clone(),
    //             || convert_object(gen_base(base), data, rpath.clone()),
    //             false,
    //         ),
    //         N::Either { base, data } => self.register_type(
    //             rpath.clone(),
    //             || convert_union(gen_base(base), &data.one_of, rpath.clone(), true),
    //             false,
    //         ),
    //         N::Union { base, data } => self.register_type(
    //             rpath.clone(),
    //             || convert_union(gen_base(base), &data.any_of, rpath.clone(), false),
    //             false,
    //         ),
    //         N::Function { base, data } => {
    //             let mat = self.materializers[data.materializer as usize].clone();
    //             self.register_type(
    //                 RelativePath::Function(idx),
    //                 || convert_function(gen_base(base), data, mat),
    //                 false,
    //             )
    //         }
    //         N::Any { .. } => unreachable!(), // FIXME is this still used?
    //     }
    // }

    pub fn convert_policies(&self, policies: &[tg_schema::PolicyIndices]) -> Vec<PolicySpec> {
        policies
            .iter()
            .map(|pol| convert_policy_spec(&self.secondary_registry.policies, pol))
            .collect()
    }

    pub fn get_materializer(&self, idx: u32) -> Result<&Materializer> {
        self.secondary_registry
            .materializers
            .get(idx as usize)
            .ok_or_else(|| eyre!("materializer index out of bounds: {}", idx))
    }
}
