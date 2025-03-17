// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-Lice

use crate::naming::NamingEngine;
use crate::runtimes::{convert_materializer, Materializer};
use crate::types::{BooleanType, TypeNodeExt, WeakType};
use crate::{
    convert_function, convert_list, convert_object, convert_optional, convert_union, interlude::*,
    is_composite, TypeNode as _,
};
use crate::{FunctionType, IntegerType, ObjectType, Type};
use indexmap::IndexMap;
use map::ValueTypeKind;
pub use map::{
    ConversionMap, MapItem, MapValueItem, Path, PathSegment, RelativePath, TypeKey, ValueTypePath,
};
use tg_schema::runtimes::TGRuntime;

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
        for (idx, node) in schema.types.iter().enumerate() {
            eprintln!(
                "#{idx} {} {} children={:?}",
                node.type_name(),
                node.base().title,
                node.children()
            );
        }
        let runtimes: Vec<_> = schema.runtimes.iter().map(|rt| rt.clone().into()).collect();
        let materializers = schema
            .materializers
            .iter()
            .map(|mat| convert_materializer(&runtimes, mat.clone()))
            .collect();

        Conversion {
            schema: schema.clone(),
            conversion_map: ConversionMap::new(schema.types.len()),
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
            // let range = conv.conversion_map.direct.range((
            //     Bound::Included(&TypeKey(idx as u32, 0)),
            //     Bound::Included(&TypeKey(idx as u32, u32::MAX)),
            // ));
            // let range: Vec<_> = range.map(|(&k, e)| (k, e)).collect();

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

    fn register_type<C: FnOnce(TypeKey) -> Box<dyn TypeConversionResult>>(
        &mut self,
        rpath: RelativePath,
        type_idx: u32,
        convert: C,
    ) -> Result<Box<dyn TypeConversionResult>> {
        let key = self.conversion_map.get_next_type_key(type_idx)?;
        let conv_res = convert(key);
        let typ = conv_res.get_type();

        if let Some(dupl) = rpath.find_cycle(&self.schema)? {
            // cycle detected, reuse the existing type
            let key = self.conversion_map.reverse[&dupl].clone();
            let ty = self
                .conversion_map
                .get(key)
                .ok_or_else(|| eyre!("type not found for key: {:?}", key))?;
            self.conversion_map.append(key, rpath.clone())?; // note that it is a cycle??
            return Ok(finalized_type(ty));
        }

        self.conversion_map.register(rpath.clone(), typ.clone())?;

        use RelativePath as RP;
        match rpath {
            RP::Function(fn_idx) => {
                let func = typ.assert_func()?;
                self.functions.insert(fn_idx, func.clone());
            }
            RP::NsObject(path) => {
                let obj = typ.assert_object()?;
                self.namespace_objects.insert(path.clone(), obj.clone());
            }
            RP::Input(_) => {
                self.input_types.insert(typ.key(), typ.clone());
            }
            RP::Output(_) => {
                self.output_types.insert(typ.key(), typ.clone());
            }
        }

        Ok(conv_res)
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

        use RelativePath as RP;
        match &rpath {
            RP::NsObject(_) => {
                if self.conversion_map.get(TypeKey(type_idx, 0)).is_some() {
                    bail!("cannot re-covert namespace object #{type_idx}: check your typegraph");
                }
            }
            RP::Function(fn_idx) => {
                debug_assert_eq!(*fn_idx, type_idx);
                if let Some(found) = self.conversion_map.get(TypeKey(type_idx, 0)) {
                    self.conversion_map
                        .append(TypeKey(type_idx, 0), rpath.clone())?;
                    debug_assert!(matches!(found, Type::Function(_)));
                    return Ok(finalized_type(found));
                }
            }
            // TODO improve -- more deduplication
            RP::Input(vpath) | RP::Output(vpath) => {
                if !is_composite(&self.schema, type_idx)? {
                    // currently we only generate a single type from each scalar type node
                    if let Some(found) = self.conversion_map.get(TypeKey(type_idx, 0)) {
                        self.conversion_map
                            .append(TypeKey(type_idx, 0), rpath.clone())?;
                        return Ok(finalized_type(found));
                    }
                } else {
                    match &mut self.conversion_map.direct[type_idx as usize] {
                        MapItem::Value(types) => {
                            // WTF is this???
                            let found = types.iter().find(|&item| {
                                matches!(
                                    (&item.kind, &rpath),
                                    (ValueTypeKind::Input, RP::Input(_))
                                        | (ValueTypeKind::Output, RP::Output(_))
                                ) && item.relative_paths.iter().any(|rp| rp == vpath)
                            });
                            if let Some(found) = found {
                                return Ok(finalized_type(found.ty.clone()));
                            }

                            if let RP::Input(_) = &rpath {
                                // TODO is this the only comparison point?
                                let injection = rpath.get_injection(&schema);
                                let found = types.iter_mut().find(|item| {
                                    matches!(&item.kind, ValueTypeKind::Input)
                                        && item.ty.base().injection.as_ref() == injection.as_ref()
                                });
                                if let Some(found) = found {
                                    found.relative_paths.push(vpath.clone());
                                    return Ok(finalized_type(found.ty.clone()));
                                }
                            }
                        }
                        MapItem::Unset => {}
                        _ => bail!("unexpected type for value type"),
                    }
                }
            }
        }

        let schema = self.schema.clone();

        match type_node {
            N::Boolean { base } => self.register_type(rpath.clone(), type_idx, |key| {
                finalized_type(Type::Boolean(
                    BooleanType {
                        base: Self::base(key, parent, rpath, base, &schema),
                    }
                    .into(),
                ))
            }),
            N::Integer { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
            N::Float { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
            N::String { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
            N::File { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
            N::Optional { base, data } => self.register_type(rpath.clone(), type_idx, move |key| {
                convert_optional(parent, key, rpath, base, data, &schema)
            }),
            N::List { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
                convert_list(parent, key, rpath.clone(), base, data, &schema)
            }),
            N::Object { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
                convert_object(parent, key, rpath.clone(), base, data, &schema)
            }),
            N::Either { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
            N::Union { base, data } => self.register_type(rpath.clone(), type_idx, |key| {
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
                self.register_type(RelativePath::Function(type_idx), type_idx, |key| {
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
