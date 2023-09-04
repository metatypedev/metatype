// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::types::TypeId;
use crate::wit::core::{
    Core, TypeArray, TypeBase, TypeFloat, TypeFunc, TypeInteger, TypeOptional, TypeProxy,
    TypeString, TypeStruct, TypeUnion,
};

pub trait TypeBuilder {
    fn build(&mut self) -> Result<TypeId>;
}

pub trait ConcreteTypeBuilder: TypeBuilder {
    fn base_mut(&mut self) -> &mut TypeBase;

    fn named(&mut self, name: impl Into<String>) -> &mut Self {
        self.base_mut().name = Some(name.into());
        self
    }

    fn as_id(&mut self, as_id: bool) -> &mut Self {
        self.base_mut().as_id = as_id;
        self
    }

    fn config(&mut self, key: impl Into<String>, value: impl Into<String>) -> &mut Self {
        let runtime_config = &mut self.base_mut().runtime_config;
        if runtime_config.is_none() {
            *runtime_config = Some(Default::default());
        }
        runtime_config
            .as_mut()
            .unwrap()
            .push((key.into(), value.into()));
        self
    }
}

#[derive(Default)]
pub struct BooleanBuilder {
    base: TypeBase,
}

pub fn boolean() -> BooleanBuilder {
    Default::default()
}

#[derive(Default)]
pub struct IntegerBuilder {
    base: TypeBase,
    data: TypeInteger,
}

impl Default for TypeInteger {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            exclusive_minimum: None,
            exclusive_maximum: None,
            multiple_of: None,
            enumeration: None,
        }
    }
}

impl IntegerBuilder {
    pub fn min(mut self, min: i32) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: i32) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn x_min(mut self, min: i32) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    pub fn x_max(mut self, max: i32) -> Self {
        self.data.exclusive_maximum = Some(max);
        self
    }
}

pub fn integer() -> IntegerBuilder {
    Default::default()
}

#[derive(Default)]
pub struct FloatBuilder {
    base: TypeBase,
    data: TypeFloat,
}

impl Default for TypeFloat {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            exclusive_minimum: None,
            exclusive_maximum: None,
            multiple_of: None,
            enumeration: None,
        }
    }
}

impl FloatBuilder {
    pub fn min(mut self, min: f64) -> Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(mut self, max: f64) -> Self {
        self.data.max = Some(max);
        self
    }

    pub fn x_min(mut self, min: f64) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    pub fn x_max(mut self, max: f64) -> Self {
        self.data.exclusive_maximum = Some(max);
        self
    }
}

pub fn float() -> FloatBuilder {
    Default::default()
}

#[derive(Default)]
pub struct StringBuilder {
    base: TypeBase,
    data: TypeString,
}

impl Default for TypeString {
    fn default() -> Self {
        Self {
            min: None,
            max: None,
            format: None,
            pattern: None,
            enumeration: None,
        }
    }
}

pub fn string() -> StringBuilder {
    Default::default()
}

impl StringBuilder {
    pub fn format(&mut self, format: impl Into<String>) -> &mut Self {
        self.data.format = Some(format.into());
        self
    }

    pub fn enum_(&mut self, values: Vec<String>) -> &mut Self {
        self.data.enumeration = Some(
            values
                .into_iter()
                .map(|v| serde_json::to_string(&serde_json::Value::String(v)).unwrap())
                .collect(),
        );
        self
    }
}

#[derive(Default)]
pub struct OptionalBuilder {
    base: TypeBase,
    data: TypeOptional,
}

impl Default for TypeOptional {
    fn default() -> Self {
        Self {
            of: u32::max_value(),
            default_item: None,
        }
    }
}

pub fn optional(ty: TypeId) -> OptionalBuilder {
    OptionalBuilder {
        base: TypeBase::default(),
        data: TypeOptional {
            of: ty.into(),
            default_item: None,
        },
    }
}

#[derive(Default)]
pub struct ArrayBuilder {
    base: TypeBase,
    data: TypeArray,
}

impl Default for TypeArray {
    fn default() -> Self {
        Self {
            of: u32::max_value(),
            min: None,
            max: None,
            unique_items: None,
        }
    }
}

pub fn array(ty: TypeId) -> ArrayBuilder {
    ArrayBuilder {
        base: TypeBase::default(),
        data: TypeArray {
            of: ty.into(),
            ..Default::default()
        },
    }
}

#[derive(Default)]
pub struct UnionBuilder {
    base: TypeBase,
    data: TypeUnion,
}

impl Default for TypeUnion {
    fn default() -> Self {
        Self {
            variants: Default::default(),
        }
    }
}

pub fn union(variants: impl IntoIterator<Item = TypeId>) -> UnionBuilder {
    UnionBuilder {
        data: TypeUnion {
            variants: variants.into_iter().map(|tid| tid.0).collect(),
        },
        ..Default::default()
    }
}

#[derive(Default)]
pub struct StructBuilder {
    base: TypeBase,
    data: TypeStruct,
}

impl Default for TypeStruct {
    fn default() -> Self {
        Self {
            props: Vec::new(),
            additional_props: false,
            min: None,
            max: None,
        }
    }
}

pub fn struct_() -> StructBuilder {
    Default::default()
}

impl StructBuilder {
    pub fn prop(&mut self, name: impl Into<String>, ty: TypeId) -> &mut Self {
        self.data.props.push((name.into(), ty.into()));
        self
    }

    pub fn props(&mut self, props: impl IntoIterator<Item = (String, TypeId)>) {
        self.data
            .props
            .extend(props.into_iter().map(|(name, ty)| (name, ty.into())));
    }

    pub fn min(&mut self, min: u32) -> &mut Self {
        self.data.min = Some(min);
        self
    }

    pub fn max(&mut self, max: u32) -> &mut Self {
        self.data.max = Some(max);
        self
    }
}

#[derive(Default)]
pub struct FuncBuilder {
    base: TypeBase,
    data: TypeFunc,
}

impl Default for TypeFunc {
    fn default() -> Self {
        Self {
            inp: u32::max_value(),
            out: u32::max_value(),
            mat: u32::max_value(),
        }
    }
}

pub fn func(inp: TypeId, out: TypeId, mat: u32) -> Result<TypeId> {
    FuncBuilder {
        data: TypeFunc {
            inp: inp.into(),
            out: out.into(),
            mat,
        },
        ..Default::default()
    }
    .build()
}

#[derive(Default)]
pub struct ProxyBuilder {
    data: TypeProxy,
}

impl Default for TypeProxy {
    fn default() -> Self {
        Self {
            name: "".to_string(),
            extras: vec![],
        }
    }
}

impl ProxyBuilder {
    pub fn ex(&mut self, key: impl Into<String>, value: impl Into<String>) -> &mut Self {
        self.data.extras.push((key.into(), value.into()));
        self
    }
}

pub fn proxy(name: impl Into<String>) -> ProxyBuilder {
    ProxyBuilder {
        data: TypeProxy {
            name: name.into(),
            ..Default::default()
        },
    }
}

macro_rules! impl_type_builder {
    ( $ty:ty, $build:ident ) => {
        impl TypeBuilder for $ty {
            fn build(&mut self) -> Result<TypeId> {
                let builder = std::mem::replace(self, Default::default());
                Ok($crate::Lib::$build(builder.data, builder.base)?.into())
            }
        }

        impl ConcreteTypeBuilder for $ty {
            fn base_mut(&mut self) -> &mut TypeBase {
                &mut self.base
            }
        }
    };

    ( $ty:ty, $build:ident, true ) => {
        impl TypeBuilder for $ty {
            fn build(&mut self) -> Result<TypeId> {
                let builder = std::mem::replace(self, Default::default());
                Ok($crate::Lib::$build(builder.data)?.into())
            }
        }
    };
}
impl TypeBuilder for BooleanBuilder {
    fn build(&mut self) -> Result<TypeId> {
        let builder = std::mem::replace(self, Default::default());
        Ok(crate::Lib::booleanb(builder.base)?.into())
    }
}

impl ConcreteTypeBuilder for BooleanBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
    }
}

impl_type_builder!(IntegerBuilder, integerb);
impl_type_builder!(FloatBuilder, floatb);
impl_type_builder!(OptionalBuilder, optionalb);
impl_type_builder!(StringBuilder, stringb);
impl_type_builder!(ArrayBuilder, arrayb);
impl_type_builder!(UnionBuilder, unionb);
impl_type_builder!(StructBuilder, structb);
impl_type_builder!(FuncBuilder, funcb, true);
impl_type_builder!(ProxyBuilder, proxyb, true);
