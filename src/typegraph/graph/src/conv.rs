// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;

use crate::types::{BooleanType, WeakType};
use crate::{IntegerType, Lrc, ObjectProperty, Type};

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum Scope {
    Input { parent_fn: u32 },
    Output { parent_fn: u32 },
    Namespace,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum PathSegment {
    ObjectProp(Lrc<str>),
    ListItem,
    Optional,
    UnionVariant(u32),
    EitherVariant(u32),
}

type Path = Vec<PathSegment>;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct ConversionKey {
    scope: Scope,
    path: Path,
}

impl ConversionKey {
    fn push(&self, segment: PathSegment) -> ConversionKey {
        let mut path = self.path.clone();
        path.push(segment);
        ConversionKey {
            scope: self.scope.clone(),
            path,
        }
    }
}

impl From<(Scope, Path)> for ConversionKey {
    fn from((scope, path): (Scope, Path)) -> Self {
        ConversionKey { scope, path }
    }
}

pub struct Conversion {
    schema: Lrc<tg_schema::Typegraph>,
    types: Vec<HashMap<ConversionKey, WeakType>>,
}

impl Conversion {
    fn new(schema: Lrc<tg_schema::Typegraph>) -> Conversion {
        let mut types = Vec::with_capacity(schema.types.len());
        types.resize_with(schema.types.len(), Default::default);
        Conversion {
            schema: schema.clone(),
            types,
        }
    }

    pub fn convert(schema: Lrc<tg_schema::Typegraph>) -> crate::Typegraph {
        let mut conv = Conversion::new(schema.clone());
        let root = conv.convert_type(
            WeakType::Object(Default::default()),
            0,
            (Scope::Namespace, vec![]).into(),
        );
        crate::Typegraph {
            schema,
            root,
            types: conv.types,
        }
    }

    fn register_type(&mut self, type_idx: u32, key: ConversionKey, typ: Type) -> Type {
        self.types[type_idx as usize].insert(key, typ.downgrade());
        typ
    }

    pub fn convert_type(&mut self, parent: WeakType, type_idx: u32, key: ConversionKey) -> Type {
        let schema = self.schema.clone();
        let type_node = &schema.types[type_idx as usize];
        use tg_schema::TypeNode as N;

        {
            let cache = &self.types[type_idx as usize];
            // FIXME(perf) different conversion keys might yield the same type
            if let Some(t) = cache.get(&key) {
                // TODO assert same parent
                return t.upgrade().unwrap();
            }
        }

        match type_node {
            N::Boolean { base } => self.register_type(
                type_idx,
                key,
                Type::Boolean(
                    BooleanType {
                        base: Self::base(parent, type_idx, base),
                    }
                    .into(),
                ),
            ),
            N::Integer { base, data } => self.register_type(
                type_idx,
                key,
                Type::Integer(
                    IntegerType {
                        base: Self::base(parent, type_idx, base),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                ),
            ),
            N::Float { base, data } => self.register_type(
                type_idx,
                key,
                Type::Float(
                    crate::FloatType {
                        base: Self::base(parent, type_idx, base),
                        minimum: data.minimum,
                        maximum: data.maximum,
                        exclusive_minimum: data.exclusive_minimum,
                        exclusive_maximum: data.exclusive_maximum,
                        multiple_of: data.multiple_of,
                    }
                    .into(),
                ),
            ),
            N::String { base, data } => self.register_type(
                type_idx,
                key,
                Type::String(
                    crate::StringType {
                        base: Self::base(parent, type_idx, base),
                        pattern: data.pattern.clone(),
                        format: data.format.clone(),
                        min_length: data.min_length,
                        max_length: data.max_length,
                    }
                    .into(),
                ),
            ),
            N::File { base, data } => self.register_type(
                type_idx,
                key,
                Type::File(
                    crate::FileType {
                        base: Self::base(parent, type_idx, base),
                        min_size: data.min_size,
                        max_size: data.max_size,
                        mime_types: data.mime_types.clone(),
                    }
                    .into(),
                ),
            ),
            N::Optional { base, data } => self.convert_optional(parent, type_idx, key, base, data),
            N::List { base, data } => self.convert_list(parent, type_idx, key, base, data),
            N::Object { base, data } => self.convert_object(parent, type_idx, key, base, data),
            N::Either { base, data } => self.convert_either(parent, type_idx, key, base, data),
            N::Union { base, data } => self.convert_union(parent, type_idx, key, base, data),
            N::Function { base, data } => self.convert_function(parent, type_idx, key, base, data),
            N::Any { .. } => unreachable!(), // FIXME is this still used?
        }
    }

    fn convert_optional(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::OptionalTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::Optional(
                crate::OptionalType {
                    base: Self::base(parent, type_idx, base),
                    item: Default::default(),
                    default_value: data.default_value.clone(),
                }
                .into(),
            ),
        );

        let item = self.convert_type(res.downgrade(), data.item, key.push(PathSegment::Optional));

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
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::ListTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::List(
                crate::ListType {
                    base: Self::base(parent, type_idx, base),
                    item: Default::default(),
                    min_items: data.min_items,
                    max_items: data.max_items,
                    unique_items: data.unique_items.unwrap_or(false),
                }
                .into(),
            ),
        );

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
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::ObjectTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::Object(
                crate::ObjectType {
                    base: Self::base(parent, type_idx, base),
                    properties: Default::default(),
                }
                .into(),
            ),
        );

        let mut properties = HashMap::with_capacity(data.properties.len());

        for (name, &prop) in &data.properties {
            let name: Lrc<str> = name.clone().into();
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
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::UnionTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::Union(
                crate::UnionType {
                    base: Self::base(parent, type_idx, base),
                    variants: Default::default(),
                }
                .into(),
            ),
        );

        let mut variants = Vec::with_capacity(data.any_of.len());

        for (i, &variant_idx) in data.any_of.iter().enumerate() {
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

    fn convert_either(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::EitherTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::Either(
                crate::EitherType {
                    base: Self::base(parent, type_idx, base),
                    variants: Default::default(),
                }
                .into(),
            ),
        );

        let mut variants = Vec::with_capacity(data.one_of.len());

        for (i, &variant_idx) in data.one_of.iter().enumerate() {
            let key = key.push(PathSegment::EitherVariant(i as u32));
            let variant_type = self.convert_type(res.downgrade(), variant_idx, key);
            variants.push(variant_type);
        }

        match &res {
            Type::Either(either) => {
                // TODO error handling
                either.variants.set(variants).unwrap();
            }
            _ => unreachable!(),
        }

        res
    }

    fn convert_function(
        &mut self,
        parent: WeakType,
        type_idx: u32,
        key: ConversionKey,
        base: &tg_schema::TypeNodeBase,
        data: &tg_schema::FunctionTypeData,
    ) -> Type {
        let res = self.register_type(
            type_idx,
            key.clone(),
            Type::Function(
                crate::FunctionType {
                    base: Self::base(parent, type_idx, base),
                    input: Default::default(),
                    output: Default::default(),
                    parameter_transform: data.parameter_transform.clone(),
                    runtime_config: data.runtime_config.clone(),
                    materializer: Default::default(), // TODO
                    rate_weight: data.rate_weight,
                    rate_calls: data.rate_calls,
                }
                .into(),
            ),
        );

        let input = self.convert_type(
            res.downgrade(),
            data.input,
            (
                Scope::Input {
                    parent_fn: type_idx,
                },
                vec![],
            )
                .into(),
        );

        let output = self.convert_type(
            res.downgrade(),
            data.output,
            (
                Scope::Output {
                    parent_fn: type_idx,
                },
                vec![],
            )
                .into(),
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

    fn base(parent: WeakType, type_idx: u32, base: &tg_schema::TypeNodeBase) -> crate::TypeBase {
        crate::TypeBase {
            parent,
            type_idx,
            title: base.title.clone(),
            description: base.description.clone(),
        }
    }
}
