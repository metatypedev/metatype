// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use crate::naming::NamingEngine;
use crate::runtimes::{convert_materializer, Materializer};
use crate::types::{BooleanType, TypeNodeExt, WeakType};
use crate::{FunctionType, IntegerType, ObjectProperty, ObjectType, Type, TypeNode as _};
pub use key::{Key, Path, PathSegment, ValueTypeKey};
use std::collections::HashMap;
use tg_schema::runtimes::TGRuntime;

mod key;

// enum ValueTypeKind {
//     Input,
//     Output,
// }

/// A conversion map is associated to each type in the typegraph schema.
/// Functions and namespace objects are converted to a single node,
/// while value types are converted into one or more input types and one or more output types.
#[derive(Debug, Default)]
pub enum ConversionMap {
    #[default]
    Unset,
    ValueType {
        inputs: HashMap<ValueTypeKey, Type>,
        outputs: HashMap<ValueTypeKey, Type>,
    },
    Function(Arc<FunctionType>),
    NsObject(Arc<ObjectType>),
}

impl ConversionMap {
    pub fn register_input(&mut self, key: ValueTypeKey, typ: Type) {
        match self {
            ConversionMap::ValueType { inputs, .. } => {
                inputs.insert(key, typ);
            }
            _ => unreachable!(), // TODO error
        }
    }

    pub fn register_output(&mut self, key: ValueTypeKey, typ: Type) {
        match self {
            ConversionMap::ValueType { outputs, .. } => {
                outputs.insert(key, typ);
            }
            _ => unreachable!(), // TODO error
        }
    }
}

pub struct Conversion {
    schema: Arc<tg_schema::Typegraph>,
    types: Vec<ConversionMap>,
    input_types: HashMap<ValueTypeKey, Type>,
    output_types: HashMap<ValueTypeKey, Type>,
    functions: HashMap<u32, Arc<FunctionType>>,
    namespace_objects: HashMap<Vec<Arc<str>>, Arc<ObjectType>>,
    materializers: Vec<Materializer>,
    runtimes: Vec<Arc<TGRuntime>>,
}

impl Conversion {
    fn new(schema: Arc<tg_schema::Typegraph>) -> Conversion {
        let mut types = Vec::with_capacity(schema.types.len());
        let runtimes: Vec<_> = schema.runtimes.iter().map(|rt| rt.clone().into()).collect();
        let materializers = schema
            .materializers
            .iter()
            .map(|mat| convert_materializer(&runtimes, mat.clone()))
            .collect();

        types.resize_with(schema.types.len(), Default::default);
        Conversion {
            schema: schema.clone(),
            types,
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
        let root = conv.convert_type(WeakType::Object(Default::default()), 0, Key::root());
        let mut ne = naming_engine;
        for map in conv.types.iter() {
            match map {
                ConversionMap::Function(func) => ne.name_function(func),
                ConversionMap::NsObject(obj) => ne.name_ns_object(obj),
                ConversionMap::ValueType { inputs, outputs } => {
                    ne.name_value_types(inputs, outputs)
                }
                ConversionMap::Unset => (),
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

    fn register_type(&mut self, typ: Type) -> Type {
        let idx = typ.base().type_idx as usize;
        // let ty = typ.clone();
        match typ.key() {
            Key::Function(fn_idx) => {
                let func = typ.as_func().unwrap();
                self.functions.insert(*fn_idx, func.clone());
                self.types[idx] = ConversionMap::Function(func.clone());
            }
            Key::NsObject(path) => {
                let obj = typ.assert_object().unwrap();
                self.namespace_objects.insert(path.clone(), obj.clone());
                self.types[idx] = ConversionMap::NsObject(obj.clone());
            }
            Key::Input(key) => {
                self.input_types.insert(key.clone(), typ.clone());
                match &self.types[idx] {
                    ConversionMap::Unset => {
                        self.types[idx] = ConversionMap::ValueType {
                            inputs: Default::default(),
                            outputs: Default::default(),
                        };
                    }
                    _ => (),
                }
                self.types[idx].register_input(key.clone(), typ.clone());
            }
            Key::Output(key) => {
                self.output_types.insert(key.clone(), typ.clone());
                if !matches!(self.types[idx], ConversionMap::ValueType { .. }) {
                    self.types[idx] = ConversionMap::ValueType {
                        inputs: Default::default(),
                        outputs: Default::default(),
                    };
                }
                self.types[idx].register_output(key.clone(), typ.clone());
            }
        }
        typ
    }

    pub fn convert_type(&mut self, parent: WeakType, type_idx: u32, key: Key) -> Type {
        let schema = self.schema.clone();
        let type_node = &schema.types[type_idx as usize];
        use tg_schema::TypeNode as N;

        {
            let cache = &self.types[type_idx as usize];
            match (&key, cache) {
                (_, ConversionMap::Unset) => (),
                (Key::NsObject(_), ConversionMap::NsObject(obj)) => {
                    if obj.base().type_idx == type_idx {
                        return Type::Object(obj.clone());
                    }
                }
                (Key::Input(key), ConversionMap::ValueType { inputs, .. }) => {
                    if let Some(t) = inputs.get(&key) {
                        return t.clone();
                    }
                }
                (Key::Output(key), ConversionMap::ValueType { outputs, .. }) => {
                    if let Some(t) = outputs.get(&key) {
                        return t.clone();
                    }
                }
                (Key::Function(fn_idx), ConversionMap::Function(func)) => {
                    if func.base().type_idx == *fn_idx {
                        return Type::Function(func.clone());
                    }
                }
                _ => unreachable!(),
            }
        }

        match type_node {
            N::Boolean { base } => self.register_type(Type::Boolean(
                BooleanType {
                    base: Self::base(key, parent, type_idx, base),
                }
                .into(),
            )),
            N::Integer { base, data } => self.register_type(Type::Integer(
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
            N::Float { base, data } => self.register_type(Type::Float(
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
            N::String { base, data } => self.register_type(Type::String(
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
            N::File { base, data } => self.register_type(Type::File(
                crate::FileType {
                    base: Self::base(key, parent, type_idx, base),
                    min_size: data.min_size,
                    max_size: data.max_size,
                    mime_types: data.mime_types.clone(),
                }
                .into(),
            )),
            N::Optional { base, data } => self.convert_optional(parent, type_idx, key, base, data),
            N::List { base, data } => self.convert_list(parent, type_idx, key, base, data),
            N::Object { base, data } => self.convert_object(parent, type_idx, key, base, data),
            N::Either { base, data } => {
                self.convert_union(parent, type_idx, key, base, &data.one_of, true)
            }
            N::Union { base, data } => {
                self.convert_union(parent, type_idx, key, base, &data.any_of, false)
            }
            N::Function { base, data } => self.convert_function(parent, type_idx, base, data),
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    fn convert_optional(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: Key,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::OptionalTypeData,
    ) -> Type {
        let res = self.register_type(Type::Optional(
            crate::OptionalType {
                base: Self::base(key.clone(), parent, type_idx, base),
                item: Default::default(),
                default_value: data.default_value.clone(),
            }
            .into(),
        ));

        let item = self.convert_type(
            res.downgrade(),
            data.item,
            key.push(PathSegment::OptionalItem),
        );

        match &res {
            Type::Optional(opt) => {
                // TODO error handling
                opt.item.set(item).unwrap();
            }
            _ => unreachable!(),
        }

        res
    }

    fn convert_list(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: Key,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::ListTypeData,
    ) -> Type {
        let res = self.register_type(Type::List(
            crate::ListType {
                base: Self::base(key.clone(), parent, type_idx, base),
                item: Default::default(),
                min_items: data.min_items,
                max_items: data.max_items,
                unique_items: data.unique_items.unwrap_or(false),
            }
            .into(),
        ));

        let item = self.convert_type(res.downgrade(), data.items, key.push(PathSegment::ListItem));

        match &res {
            Type::List(list) => {
                // TODO error handling
                list.item.set(item).unwrap();
            }
            _ => unreachable!(),
        }

        res
    }

    fn convert_object(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: Key,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::ObjectTypeData,
    ) -> Type {
        let res = self.register_type(Type::Object(
            crate::ObjectType {
                base: Self::base(key.clone(), parent, type_idx, base),
                properties: Default::default(),
            }
            .into(),
        ));

        let mut properties = HashMap::with_capacity(data.properties.len());

        for (name, &prop) in &data.properties {
            let name: Arc<str> = name.clone().into();
            let key = key.push(PathSegment::ObjectProp(name.clone()));
            let prop_type = self.convert_type(res.downgrade(), prop, key);
            properties.insert(
                name.clone(),
                ObjectProperty {
                    type_: prop_type,
                    policies: Default::default(), // TODO
                    injection: None,              // TODO
                    outjection: None,             // TODO
                    required: data.required.iter().any(|r| r == name.as_ref()),
                },
            );
        }

        match &res {
            Type::Object(obj) => {
                // TODO error handling
                obj.properties.set(properties).unwrap();
            }
            _ => unreachable!(),
        }

        res
    }

    fn convert_union(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: Key,
        base: &tg_schema::TypeNodeBase,
        variant_indices: &[u32],
        either: bool,
    ) -> Type {
        let res = self.register_type(Type::Union(
            crate::UnionType {
                base: Self::base(key.clone(), parent, type_idx, base),
                variants: Default::default(),
                either,
            }
            .into(),
        ));

        let mut variants = Vec::with_capacity(variant_indices.len());

        for (i, &variant_idx) in variant_indices.iter().enumerate() {
            let key = key.push(PathSegment::UnionVariant(i as u32));
            let variant_type = self.convert_type(res.downgrade(), variant_idx, key);
            variants.push(variant_type);
        }

        match &res {
            Type::Union(union) => {
                // TODO error handling
                union.variants.set(variants).unwrap();
            }
            _ => unreachable!(),
        }

        res
    }

    fn convert_function(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::FunctionTypeData,
    ) -> Type {
        let res = self.register_type(Type::Function(
            crate::FunctionType {
                base: Self::base(Key::Function(type_idx), parent, type_idx, base),
                input: Default::default(),
                output: Default::default(),
                parameter_transform: data.parameter_transform.clone(),
                runtime_config: data.runtime_config.clone(),
                materializer: self.materializers[data.materializer as usize].clone(),
                rate_weight: data.rate_weight,
                rate_calls: data.rate_calls,
            }
            .into(),
        ));

        let weak = res.downgrade();
        let weak = weak.as_func().unwrap();

        let input = self.convert_type(
            res.downgrade(),
            data.input,
            Key::input(weak.clone(), vec![]),
        );

        let output = self.convert_type(
            res.downgrade(),
            data.output,
            Key::output(weak.clone(), vec![]),
        );

        match &res {
            Type::Function(func) => {
                // TODO error handling
                match input {
                    Type::Object(obj) => {
                        func.input.set(obj).unwrap();
                    }
                    _ => unreachable!(), // TODO??
                }

                func.output.set(output).unwrap();

                // TODO materializer
            }
            _ => unreachable!(),
        }

        res
    }

    fn base(
        key: Key,
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
