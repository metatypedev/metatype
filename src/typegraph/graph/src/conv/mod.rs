// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-Lice

use crate::naming::NamingEngine;
use crate::runtimes::{convert_materializer, Materializer};
use crate::types::{BooleanType, TypeNodeExt, WeakType};
use crate::{
    convert_function, convert_list, convert_object, convert_optional, convert_union, interlude::*,
    is_composite, is_function, TypeNode as _,
};
use crate::{FunctionType, IntegerType, ObjectType, Type};
use dedup::{Deduplication, DuplicationKey};
use indexmap::IndexMap;
pub use map::{
    ConversionMap, MapItem, MapValueItem, Path, PathSegment, RelativePath, TypeKey, ValueType,
    ValueTypePath,
};
use tg_schema::runtimes::TGRuntime;

mod dedup;
mod map;

pub mod interlude {
    pub use super::{Conversion, PathSegment, RelativePath, TypeConversionResult, TypeKey};
}

pub struct Conversion {
    schema: Arc<tg_schema::Typegraph>,
    conversion_map: ConversionMap,
    input_types: IndexMap<TypeKey, Type>,
    output_types: IndexMap<TypeKey, Type>,
    functions: IndexMap<u32, Arc<FunctionType>>,
    namespace_objects: IndexMap<Vec<Arc<str>>, Arc<ObjectType>>,
    materializers: Vec<Materializer>,
    runtimes: Vec<Arc<TGRuntime>>,
}

pub trait TypeConversionResult {
    fn get_type(&self) -> Type;
    fn finalize(&mut self, conv: &mut Conversion) -> Result<()>; // convert children
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

    fn finalize(&mut self, _conv: &mut Conversion) -> Result<()> {
        // nothing to do
        Ok(())
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
            conversion_map: ConversionMap::new(schema),
            input_types: Default::default(),
            output_types: Default::default(),
            functions: Default::default(),
            namespace_objects: Default::default(),
            materializers,
            runtimes,
        }
    }

    pub fn convert<NE>(
        schema: Arc<tg_schema::Typegraph>,
        naming_engine: NE,
    ) -> Result<crate::Typegraph>
    where
        NE: NamingEngine,
    {
        let mut conv = Conversion::new(schema.clone());
        let mut res = conv.convert_type(
            WeakType::Object(Default::default()),
            0,
            RelativePath::root(),
        )?;
        let root = res.get_type();
        res.finalize(&mut conv)?;

        let mut ne = naming_engine;

        for idx in 0..schema.types.len() {
            match conv
                .conversion_map
                .direct
                .get(idx)
                .unwrap_or(&MapItem::Unset)
            {
                MapItem::Unset => {
                    bail!("no type for type idx: {}", idx);
                }
                MapItem::Function(ty) => {
                    ne.name_function(ty)?;
                }
                MapItem::Namespace(ty, _) => {
                    ne.name_ns_object(ty)?;
                }
                MapItem::Value(types) => {
                    ne.name_value_types(types)?;
                }
            }
        }

        let reg = std::mem::take(ne.registry());
        Ok(crate::Typegraph {
            schema,
            root: root.assert_object()?.clone(),
            input_types: conv.input_types,
            output_types: conv.output_types,
            functions: conv.functions,
            namespace_objects: conv.namespace_objects,
            named: reg.map,
            conversion_map: conv
                .conversion_map
                .direct
                .into_iter()
                .map(|item| crate::MapItem::try_from(item))
                .collect::<Result<Vec<_>>>()?,
            materializers: conv.materializers,
            runtimes: conv.runtimes,
        })
    }

    fn register_converted_type(
        &mut self,
        rpath: RelativePath,
        ty: Type,
        duplicate: bool, // -> recursive
    ) -> Result<()> {
        if !duplicate {
            self.conversion_map.register(rpath.clone(), ty.clone())?;
            // recursivity will be handled by the finalizer
        } else if !matches!(ty, Type::Function(_)) {
            // value type

            let added = self.conversion_map.append(ty.key(), rpath.clone())?;
            // TODO cycle detection
            if added {
                for edge in ty.edges()? {
                    let child_ty = edge.to;
                    if let Ok(seg) = edge.kind.try_into() {
                        self.register_converted_type(rpath.push(seg)?, child_ty, true)?;
                    }
                }
            }
        }

        use RelativePath as RP;
        match rpath {
            RP::Function(fn_idx) => {
                self.functions.insert(fn_idx, ty.assert_func()?.clone());
            }
            RP::NsObject(path) => {
                self.namespace_objects
                    .insert(path.clone(), ty.assert_object()?.clone());
            }
            RP::Input(_) => {
                self.input_types.insert(ty.key(), ty.clone());
            }
            RP::Output(_) => {
                self.output_types.insert(ty.key(), ty.clone());
            }
        }

        Ok(())
    }

    fn register_type_2<C: FnOnce(TypeKey) -> Box<dyn TypeConversionResult>>(
        &mut self,
        rpath: RelativePath,
        key: TypeKey,
        convert: C,
        duplicate: bool,
    ) -> Result<Box<dyn TypeConversionResult>> {
        let conv_res = convert(key);
        let typ = conv_res.get_type();

        self.register_converted_type(rpath.clone(), typ.clone(), duplicate)?;

        Ok(conv_res)
    }

    fn register_type<C: FnOnce(TypeKey) -> Box<dyn TypeConversionResult>>(
        &mut self,
        rpath: RelativePath,
        key: TypeKey,
        convert: C,
    ) -> Result<Box<dyn TypeConversionResult>> {
        self.register_type_2(rpath, key, convert, false)
    }

    pub fn convert_type(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        rpath: RelativePath,
    ) -> Result<Box<dyn TypeConversionResult>> {
        let schema = self.schema.clone();
        let type_node = &schema.types[type_idx as usize];
        use tg_schema::TypeNode as N;

        let dkey = if !is_function(&schema, type_idx) && is_composite(&schema, type_idx)? {
            DuplicationKey::from_rpath(&schema, &rpath)
        } else {
            // currently, we only generate a single type from each scalar type node
            Default::default()
        };
        let key = match self.conversion_map.deduplicate(type_idx, &dkey)? {
            Deduplication::Reuse(ty) => {
                return self.register_type_2(rpath.clone(), ty.key(), |_| finalized_type(ty), true);
            }
            Deduplication::Register(tkey) => tkey,
        };

        let schema = self.schema.clone();

        match type_node {
            N::Boolean { base } => self.register_type(rpath.clone(), key, |key| {
                finalized_type(Type::Boolean(
                    BooleanType {
                        base: Self::base(key, parent, rpath, base, &schema),
                    }
                    .into(),
                ))
            }),
            N::Integer { base, data } => self.register_type(rpath.clone(), key, |key| {
                finalized_type(Type::Integer(
                    IntegerType {
                        base: Self::base(key, parent, rpath, base, &schema),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                ))
            }),
            N::Float { base, data } => self.register_type(rpath.clone(), key, |key| {
                finalized_type(Type::Float(
                    crate::FloatType {
                        base: Self::base(key, parent, rpath, base, &schema),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                ))
            }),
            N::String { base, data } => self.register_type(rpath.clone(), key, |key| {
                finalized_type(Type::String(
                    crate::StringType {
                        base: Self::base(key, parent, rpath, base, &schema),
                        pattern: data.pattern.clone(),
                        format: data.format.clone(),
                        min_length: data.min_length,
                        max_length: data.max_length,
                        enumeration: base.enumeration.clone(),
                    }
                    .into(),
                ))
            }),
            N::File { base, data } => self.register_type(rpath.clone(), key, |key| {
                finalized_type(Type::File(
                    crate::FileType {
                        base: Self::base(key, parent, rpath, base, &schema),
                        min_size: data.min_size,
                        max_size: data.max_size,
                        mime_types: data.mime_types.clone(),
                    }
                    .into(),
                ))
            }),
            N::Optional { base, data } => self.register_type(rpath.clone(), key, move |key| {
                convert_optional(parent, key, rpath, base, data, &schema)
            }),
            N::List { base, data } => self.register_type(rpath.clone(), key, |key| {
                convert_list(parent, key, rpath.clone(), base, data, &schema)
            }),
            N::Object { base, data } => self.register_type(rpath.clone(), key, |key| {
                convert_object(parent, key, rpath.clone(), base, data, &schema)
            }),
            N::Either { base, data } => self.register_type(rpath.clone(), key, |key| {
                convert_union(
                    parent,
                    key,
                    rpath.clone(),
                    base,
                    &data.one_of,
                    &schema,
                    true,
                )
            }),
            N::Union { base, data } => self.register_type(rpath.clone(), key, |key| {
                convert_union(
                    parent,
                    key,
                    rpath.clone(),
                    base,
                    &data.any_of,
                    &schema,
                    false,
                )
            }),
            N::Function { base, data } => {
                let mat = self.materializers[data.materializer as usize].clone();
                self.register_type(RelativePath::Function(type_idx), key, |key| {
                    convert_function(parent, key, base, data, mat, &schema)
                })
            }
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    pub fn base(
        key: TypeKey,
        parent: WeakType,
        rpath: RelativePath,
        base: &tg_schema::TypeNodeBase,
        schema: &tg_schema::Typegraph,
    ) -> crate::TypeBase {
        crate::TypeBase {
            key,
            parent,
            type_idx: key.0,
            title: base.title.clone(),
            name: Default::default(),
            description: base.description.clone(),
            injection: rpath.get_injection(schema),
        }
    }
}
