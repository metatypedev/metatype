// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::naming::NamingEngine;
use crate::runtimes::{convert_materializer, Materializer};
use crate::types::{BooleanType, TypeNodeExt, WeakType};
use crate::{
    convert_function, convert_list, convert_object, convert_optional, convert_union, interlude::*,
    is_composite,
};
use crate::{FunctionType, IntegerType, ObjectType, Type};
pub use map::{ConversionMap, MapEntry, Path, PathSegment, RelativePath, TypeKey, ValueTypePath};
use std::collections::HashMap;
use std::ops::Bound;
use tg_schema::runtimes::TGRuntime;

mod map;

pub mod interlude {
    pub use super::{Conversion, PathSegment, RelativePath, TypeConversionResult, TypeKey};
}

// enum ValueTypeKind {
//     Input,
//     Output,
// }

// /// A conversion map is associated to each type in the typegraph schema.
// /// Functions and namespace objects are converted to a single node,
// /// while value types are converted into one or more input types and one or more output types.
// #[deriveDebug, Default]
// pub enum ConversionMap {
//     #[default]
//     Unset,
//     ValueType {
//         inputs: HashMap<ValueTypeKey, Type>,
//         outputs: HashMap<ValueTypeKey, Type>,
//     },
//     Function(Arc<FunctionType>),
//     NsObject(Arc<ObjectType>),
// }

// impl ConversionMap {
//     pub fn register_input(&mut self, key: ValueTypeKey, typ: Type) {
//         match self {
//             ConversionMap::ValueType { inputs, .. } => {
//                 inputs.insert(key, typ);
//             }
//             _ => unreachable!(), // TODO error
//         }
//     }
//
//     pub fn register_output(&mut self, key: ValueTypeKey, typ: Type) {
//         match self {
//             ConversionMap::ValueType { outputs, .. } => {
//                 outputs.insert(key, typ);
//             }
//             _ => unreachable!(), // TODO error
//         }
//     }
// }

pub struct Conversion {
    schema: Arc<tg_schema::Typegraph>,
    conversion_map: ConversionMap,
    input_types: HashMap<TypeKey, Type>,
    output_types: HashMap<TypeKey, Type>,
    functions: HashMap<u32, Arc<FunctionType>>,
    namespace_objects: HashMap<Vec<Arc<str>>, Arc<ObjectType>>,
    materializers: Vec<Materializer>,
    runtimes: Vec<Arc<TGRuntime>>,
}

pub trait TypeConversionResult {
    fn get_type(&self) -> Type;
    fn finalize(&mut self, conv: &mut Conversion); // convert children
}

// Type conversion that does not need propagation; cached or no children
struct FinalizedTypeConversion(Type);

fn finalized_type(ty: Type) -> Box<dyn TypeConversionResult> {
    Box::new(FinalizedTypeConversion(ty))
}

impl TypeConversionResult for FinalizedTypeConversion {
    fn get_type(&self) -> Type {
        self.0.clone()
    }

    fn finalize(&mut self, _conv: &mut Conversion) {
        // nothing to do
    }
}

impl Conversion {
    fn new(schema: Arc<tg_schema::Typegraph>) -> Conversion {
        let runtimes: Vec<_> = schema.runtimes.iter().map(|rt| rt.clone().into()).collect();
        let materializers = schema
            .materializers
            .iter()
            .map(|mat| convert_materializer(&runtimes, mat.clone()))
            .collect();

        Conversion {
            schema: schema.clone(),
            conversion_map: Default::default(),
            input_types: Default::default(),
            output_types: Default::default(),
            functions: Default::default(),
            namespace_objects: Default::default(),
            materializers,
            runtimes,
        }
    }

    pub fn convert<NE>(schema: Arc<tg_schema::Typegraph>, naming_engine: NE) -> crate::Typegraph
    where
        NE: NamingEngine,
    {
        let mut conv = Conversion::new(schema.clone());
        let mut res = conv.convert_type(
            WeakType::Object(Default::default()),
            0,
            RelativePath::root(),
        );
        let root = res.get_type();
        res.finalize(&mut conv);

        let mut ne = naming_engine;

        for idx in 0..schema.types.len() {
            let range = conv.conversion_map.direct.range((
                Bound::Included(&TypeKey(idx as u32, 0)),
                Bound::Included(&TypeKey(idx as u32, u32::MAX)),
            ));
            let range: Vec<_> = range.map(|(&k, e)| (k, e)).collect();
            match range.len() {
                0 => {
                    panic!("no type for type idx: {}", idx);
                }
                _ => {
                    use RelativePath as RP;
                    match &range[0].1.relative_paths[0] {
                        RP::Function(_) => {
                            debug_assert_eq!(range.len(), 1);
                            ne.name_function(range[0].1.node.as_func().unwrap());
                        }
                        RP::NsObject(_) => {
                            debug_assert_eq!(range.len(), 1);
                            ne.name_ns_object(range[0].1.node.as_object().unwrap());
                        }
                        RP::Input(_) | RP::Output(_) => {
                            debug_assert!(range.iter().all(|(_, e)| e
                                .relative_paths
                                .iter()
                                .all(|p| matches!(p, RP::Input(_) | RP::Output(_)))));
                            ne.name_value_types(range);
                        }
                    }
                }
            }
        }

        let reg = std::mem::take(ne.registry());
        crate::Typegraph {
            schema,
            root: root.as_object().unwrap().clone(),
            input_types: conv.input_types,
            output_types: conv.output_types,
            functions: conv.functions,
            namespace_objects: conv.namespace_objects,
            named: reg.map,
        }
    }

    fn register_type(
        &mut self,
        rpath: RelativePath,
        conv_res: Box<dyn TypeConversionResult>,
    ) -> Box<dyn TypeConversionResult> {
        let typ = conv_res.get_type();
        // eprintln!("register type: {:?}", rpath);

        if let Some(dupl) = rpath.find_cycle(&self.schema) {
            // cycle detected, reuse the existing type
            eprintln!("cycle detected: {:?} vs {:?}", dupl, rpath);
            eprintln!("   cycle: {:?}", self.conversion_map.reverse[&dupl]);
            eprintln!("skip registration for {:?}", typ.key());
            let key = self.conversion_map.reverse[&dupl].clone();
            let ty = self.conversion_map.direct[&key].node.clone();
            self.conversion_map.append(key, rpath.clone()); // note that it is a cycle??
            return finalized_type(ty);
        }

        self.conversion_map.register(rpath.clone(), typ.clone());

        use RelativePath as RP;
        match rpath {
            RP::Function(fn_idx) => {
                let func = typ.as_func().unwrap();
                self.functions.insert(fn_idx, func.clone());
            }
            RP::NsObject(path) => {
                let obj = typ.assert_object().unwrap();
                self.namespace_objects.insert(path.clone(), obj.clone());
            }
            RP::Input(_) => {
                self.input_types.insert(typ.key(), typ.clone());
            }
            RP::Output(_) => {
                self.output_types.insert(typ.key(), typ.clone());
            }
        }

        conv_res
    }

    pub fn convert_type(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        rpath: RelativePath,
    ) -> Box<dyn TypeConversionResult> {
        let schema = self.schema.clone();
        let type_node = &schema.types[type_idx as usize];
        use tg_schema::TypeNode as N;

        use RelativePath as RP;
        match &rpath {
            RP::NsObject(_) => {
                if let Some(found) = self
                    .conversion_map
                    .direct
                    .get(&TypeKey(type_idx, 0))
                    .map(|e| e.node.clone())
                {
                    // TODO assert same path
                    self.conversion_map
                        .append(TypeKey(type_idx, 0), rpath.clone());
                    debug_assert!(matches!(found, Type::Object(_)));
                    return finalized_type(found);
                }
            }
            RP::Function(fn_idx) => {
                debug_assert_eq!(*fn_idx, type_idx);
                if let Some(found) = self
                    .conversion_map
                    .direct
                    .get(&TypeKey(type_idx, 0))
                    .map(|e| e.node.clone())
                {
                    self.conversion_map
                        .append(TypeKey(type_idx, 0), rpath.clone());
                    debug_assert!(matches!(found, Type::Function(_)));
                    return finalized_type(found);
                }
            }
            // TODO consider injections
            RP::Input(_) | RP::Output(_) => {
                if !is_composite(&self.schema, type_idx) {
                    // currently we only generate a single type from each scalar type node
                    if let Some(found) = self
                        .conversion_map
                        .direct
                        .get(&TypeKey(type_idx, 0))
                        .map(|e| e.node.clone())
                    {
                        self.conversion_map
                            .append(TypeKey(type_idx, 0), rpath.clone());
                        return finalized_type(found);
                    }
                } else {
                    let range = self
                        .conversion_map
                        .direct
                        .range((
                            Bound::Included(&TypeKey(type_idx, 0)),
                            Bound::Included(&TypeKey(type_idx, u32::MAX)),
                        ))
                        .map(|(&k, e)| (k, e.clone()))
                        .collect::<Vec<_>>();
                    let found = range
                        .iter()
                        .find(|(_, e)| e.relative_paths.iter().any(|rp| rp == &rpath));
                    if let Some((k, e)) = found {
                        self.conversion_map.append(*k, rpath.clone());
                        return finalized_type(e.node.clone());
                    }
                }
            }
        }

        let range = self.conversion_map.direct.range((
            Bound::Included(&TypeKey(type_idx, 0)),
            Bound::Included(&TypeKey(type_idx, u32::MAX)),
        ));
        let latest_key = range.rev().next().map(|(k, _)| k.1).unwrap_or(0);
        let key = TypeKey(type_idx, latest_key + 1);

        match type_node {
            N::Boolean { base } => self.register_type(
                rpath,
                finalized_type(Type::Boolean(
                    BooleanType {
                        base: Self::base(key, parent, type_idx, base),
                    }
                    .into(),
                )),
            ),
            N::Integer { base, data } => self.register_type(
                rpath,
                finalized_type(Type::Integer(
                    IntegerType {
                        base: Self::base(key, parent, type_idx, base),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                )),
            ),
            N::Float { base, data } => self.register_type(
                rpath,
                finalized_type(Type::Float(
                    crate::FloatType {
                        base: Self::base(key, parent, type_idx, base),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                )),
            ),
            N::String { base, data } => self.register_type(
                rpath,
                finalized_type(Type::String(
                    crate::StringType {
                        base: Self::base(key, parent, type_idx, base),
                        pattern: data.pattern.clone(),
                        format: data.format.clone(),
                        min_length: data.min_length,
                        max_length: data.max_length,
                        enumeration: base.enumeration.clone(),
                    }
                    .into(),
                )),
            ),
            N::File { base, data } => self.register_type(
                rpath,
                finalized_type(Type::File(
                    crate::FileType {
                        base: Self::base(key, parent, type_idx, base),
                        min_size: data.min_size,
                        max_size: data.max_size,
                        mime_types: data.mime_types.clone(),
                    }
                    .into(),
                )),
            ),
            N::Optional { base, data } => self.register_type(
                rpath.clone(),
                convert_optional(parent, type_idx, key, rpath, base, data),
            ),
            N::List { base, data } => self.register_type(
                rpath.clone(),
                convert_list(parent, type_idx, key, rpath.clone(), base, data),
            ),
            N::Object { base, data } => self.register_type(
                rpath.clone(),
                convert_object(parent, type_idx, key, rpath.clone(), base, data),
            ),
            N::Either { base, data } => self.register_type(
                rpath.clone(),
                convert_union(
                    parent,
                    type_idx,
                    key,
                    rpath.clone(),
                    base,
                    &data.one_of,
                    true,
                ),
            ),
            N::Union { base, data } => self.register_type(
                rpath.clone(),
                convert_union(
                    parent,
                    type_idx,
                    key,
                    rpath.clone(),
                    base,
                    &data.any_of,
                    false,
                ),
            ),
            N::Function { base, data } => self.register_type(
                RelativePath::Function(type_idx),
                convert_function(
                    parent,
                    type_idx,
                    base,
                    data,
                    self.materializers[data.materializer as usize].clone(),
                ),
            ),
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    pub fn base(
        key: TypeKey,
        parent: WeakType,
        type_idx: u32,
        base: &tg_schema::TypeNodeBase,
    ) -> crate::TypeBase {
        crate::TypeBase {
            key,
            parent,
            type_idx,
            title: base.title.clone(),
            name: Default::default(),
            description: base.description.clone(),
        }
    }
}
