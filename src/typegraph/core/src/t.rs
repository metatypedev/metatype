// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::{NameRegistration, Store};
use crate::types::{ExtendedTypeBase, TypeDefExt, TypeId};
use crate::wit::core::{
    Guest, TypeBase, TypeEither, TypeFloat, TypeFunc, TypeInteger, TypeList, TypeOptional,
    TypeString, TypeStruct, TypeUnion,
};

pub trait TypeBuilder {
    fn build(&self) -> Result<TypeId>;

    fn optional(&self) -> Result<OptionalBuilder> {
        Ok(optional(self.build()?))
    }
}

impl<T> TypeBuilder for &mut T
where
    T: TypeBuilder,
{
    fn build(&self) -> Result<TypeId> {
        (**self).build()
    }
}

impl TypeBuilder for TypeId {
    fn build(&self) -> Result<TypeId> {
        Ok(*self)
    }
}

#[allow(unused)]
pub trait ConcreteTypeBuilder: TypeBuilder {
    fn base_mut(&mut self) -> &mut TypeBase;
    fn xbase_mut(&mut self) -> &mut ExtendedTypeBase;

    fn named(&mut self, name: impl Into<String>) -> &mut Self {
        self.base_mut().name = Some(name.into());
        self
    }

    fn as_id(&mut self, as_id: bool) -> &mut Self {
        self.base_mut().as_id = as_id;
        self
    }

    fn inject(&mut self, injection: Injection) -> &mut Self {
        self.xbase_mut().injection = Some(Box::new(injection));
        self
    }

    fn set_value<V: serde::ser::Serialize>(&mut self, val: V) -> &mut Self {
        self.inject(Injection::Static(InjectionData::SingleValue(SingleValue {
            value: serde_json::to_string(&val).unwrap(),
        })));
        eprintln!("set injection: {:?}", self.xbase_mut().injection);
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
    extended_base: ExtendedTypeBase,
}

pub fn boolean() -> BooleanBuilder {
    Default::default()
}

#[derive(Default)]
pub struct IntegerBuilder {
    base: TypeBase,
    extended_base: ExtendedTypeBase,
    data: TypeInteger,
}

#[allow(clippy::derivable_impls)]
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
    #[allow(dead_code)]
    pub fn min(mut self, min: i32) -> Self {
        self.data.min = Some(min);
        self
    }

    #[allow(dead_code)]
    pub fn max(mut self, max: i32) -> Self {
        self.data.max = Some(max);
        self
    }

    #[allow(dead_code)]
    pub fn x_min(mut self, min: i32) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    #[allow(dead_code)]
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
    extended_base: ExtendedTypeBase,
    data: TypeFloat,
}

#[allow(clippy::derivable_impls)]
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
    #[allow(dead_code)]
    pub fn min(mut self, min: f64) -> Self {
        self.data.min = Some(min);
        self
    }

    #[allow(dead_code)]
    pub fn max(mut self, max: f64) -> Self {
        self.data.max = Some(max);
        self
    }

    #[allow(dead_code)]
    pub fn x_min(mut self, min: f64) -> Self {
        self.data.exclusive_minimum = Some(min);
        self
    }

    #[allow(dead_code)]
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
    extended_base: ExtendedTypeBase,
    data: TypeString,
}

#[allow(clippy::derivable_impls)]
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
    #[allow(dead_code)]
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
    extended_base: ExtendedTypeBase,
    data: TypeOptional,
}

impl Default for TypeOptional {
    fn default() -> Self {
        Self {
            of: u32::MAX,
            default_item: None,
        }
    }
}

pub fn optional(ty: TypeId) -> OptionalBuilder {
    OptionalBuilder {
        base: TypeBase::default(),
        extended_base: ExtendedTypeBase::default(),
        data: TypeOptional {
            of: ty.into(),
            default_item: None,
        },
    }
}

pub fn optionalx(item_builder: impl TypeBuilder) -> Result<OptionalBuilder> {
    Ok(optional(item_builder.build()?))
}

#[derive(Default)]
pub struct ListBuilder {
    base: TypeBase,
    extended_base: ExtendedTypeBase,
    data: TypeList,
}

impl Default for TypeList {
    fn default() -> Self {
        Self {
            of: u32::MAX,
            min: None,
            max: None,
            unique_items: None,
        }
    }
}

pub fn list(ty: TypeId) -> ListBuilder {
    ListBuilder {
        base: TypeBase::default(),
        extended_base: ExtendedTypeBase::default(),
        data: TypeList {
            of: ty.into(),
            ..Default::default()
        },
    }
}

pub fn listx(item_builder: impl TypeBuilder) -> Result<ListBuilder> {
    Ok(list(item_builder.build()?))
}

#[derive(Default)]
pub struct UnionBuilder {
    base: TypeBase,
    extended_base: ExtendedTypeBase,
    data: TypeUnion,
}

#[allow(clippy::derivable_impls)]
impl Default for TypeUnion {
    fn default() -> Self {
        Self {
            variants: Default::default(),
        }
    }
}

impl UnionBuilder {
    pub fn add(&mut self, ty: TypeId) -> &mut Self {
        self.data.variants.push(ty.0);
        self
    }

    pub fn addx(&mut self, ty: impl TypeBuilder) -> Result<&mut Self> {
        self.add(ty.build()?);
        Ok(self)
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

macro_rules! unionx {
    [ $($ty:expr),* ] => {
        $crate::t::union(vec![$($ty.build()?),*])
    };

    [ $($ty:expr),*, ] => {
        crate::t::unionx![$($ty),*]
    };
}
use common::typegraph::{Injection, InjectionData, SingleValue};
pub(crate) use unionx;

#[derive(Default)]
pub struct EitherBuilder {
    base: TypeBase,
    extended_base: ExtendedTypeBase,
    data: TypeEither,
}

#[allow(clippy::derivable_impls)]
impl Default for TypeEither {
    fn default() -> Self {
        Self {
            variants: Default::default(),
        }
    }
}

pub fn either(variants: impl IntoIterator<Item = TypeId>) -> EitherBuilder {
    EitherBuilder {
        data: TypeEither {
            variants: variants.into_iter().map(|tid| tid.0).collect(),
        },
        ..Default::default()
    }
}

macro_rules! eitherx {
    [ $($ty:expr),* ] => {
        $crate::t::either(vec![$($ty.build()?),*])
    };

    [ $($ty:expr),*, ] => {
        crate::t::eitherx![$($ty),*]
    };
}
pub(crate) use eitherx;

#[derive(Default)]
pub struct StructBuilder {
    base: TypeBase,
    extended_base: ExtendedTypeBase,
    data: TypeStruct,
}

#[allow(clippy::derivable_impls)]
impl Default for TypeStruct {
    fn default() -> Self {
        Self {
            props: Vec::new(),
            additional_props: false,
            min: None,
            max: None,
            enumeration: None,
        }
    }
}

pub fn struct_() -> StructBuilder {
    Default::default()
}

pub fn struct_extends(ty: TypeId) -> Result<StructBuilder> {
    Ok(StructBuilder {
        data: TypeStruct {
            props: ty.as_struct().map(|typ| typ.data.props.clone())?,
            ..Default::default()
        },
        ..Default::default()
    })
}

impl StructBuilder {
    pub fn prop(&mut self, name: impl Into<String>, ty: TypeId) -> &mut Self {
        self.data.props.push((name.into(), ty.into()));
        self
    }

    pub fn propx(
        &mut self,
        name: impl Into<String>,
        builder: impl TypeBuilder,
    ) -> Result<&mut Self> {
        self.data.props.push((name.into(), builder.build()?.into()));
        Ok(self)
    }

    #[allow(dead_code)]
    pub fn props(&mut self, props: impl IntoIterator<Item = (String, TypeId)>) {
        self.data
            .props
            .extend(props.into_iter().map(|(name, ty)| (name, ty.into())));
    }

    pub fn min(&mut self, min: u32) -> &mut Self {
        self.data.min = Some(min);
        self
    }

    #[allow(dead_code)]
    pub fn max(&mut self, max: u32) -> &mut Self {
        self.data.max = Some(max);
        self
    }
}

#[derive(Default)]
pub struct FuncBuilder {
    #[allow(dead_code)]
    base: TypeBase,
    data: TypeFunc,
}

impl Default for TypeFunc {
    fn default() -> Self {
        Self {
            inp: u32::MAX,
            out: u32::MAX,
            parameter_transform: None,
            mat: u32::MAX,
            rate_calls: false,
            rate_weight: None,
        }
    }
}

#[allow(dead_code)]
pub fn func(inp: TypeId, out: TypeId, mat: u32) -> Result<TypeId> {
    FuncBuilder {
        data: TypeFunc {
            inp: inp.into(),
            out: out.into(),
            mat,
            ..Default::default()
        },
        ..Default::default()
    }
    .build()
}

pub struct RefBuilder {
    name: String,
    attributes: Vec<(String, String)>,
}

impl RefBuilder {
    /// Adds extra data entry in the proxy
    pub fn set(&mut self, key: impl Into<String>, value: impl Into<String>) -> &mut Self {
        self.attributes.push((key.into(), value.into()));
        self
    }
}

pub fn ref_(name: impl Into<String>) -> RefBuilder {
    RefBuilder {
        name: name.into(),
        attributes: Vec::new(),
    }
}

macro_rules! impl_type_builder {
    ( $ty:ty, $build:ident ) => {
        impl TypeBuilder for $ty {
            fn build(&self) -> Result<TypeId> {
                let res = $crate::Lib::$build(self.data.clone(), self.base.clone())?;
                if !self.extended_base.is_empty() {
                    let type_def = TypeId(res).as_type_def()?.unwrap();
                    Store::register_type_def(
                        move |id| type_def.with_x_base(id, self.extended_base.clone()),
                        NameRegistration(false),
                    )
                    .into()
                } else {
                    Ok(res.into())
                }
            }
        }

        impl ConcreteTypeBuilder for $ty {
            fn base_mut(&mut self) -> &mut TypeBase {
                &mut self.base
            }

            fn xbase_mut(&mut self) -> &mut ExtendedTypeBase {
                &mut self.extended_base
            }
        }
    };

    ( $ty:ty, $build:ident, true ) => {
        impl TypeBuilder for $ty {
            fn build(&self) -> Result<TypeId> {
                let builder = self.clone();
                Ok($crate::Lib::$build(builder.data.clone())?.into())
            }
        }
    };
}
impl TypeBuilder for BooleanBuilder {
    fn build(&self) -> Result<TypeId> {
        let res = crate::Lib::booleanb(self.base.clone())?;
        if !self.extended_base.is_empty() {
            let type_def = TypeId(res).as_type_def()?.unwrap();
            Store::register_type_def(
                move |id| type_def.with_x_base(id, self.extended_base.clone()),
                // TODO
                NameRegistration(false),
            )
        } else {
            Ok(res.into())
        }
    }
}

impl ConcreteTypeBuilder for BooleanBuilder {
    fn base_mut(&mut self) -> &mut TypeBase {
        &mut self.base
    }

    fn xbase_mut(&mut self) -> &mut ExtendedTypeBase {
        &mut self.extended_base
    }
}

impl_type_builder!(IntegerBuilder, integerb);
impl_type_builder!(FloatBuilder, floatb);
impl_type_builder!(OptionalBuilder, optionalb);
impl_type_builder!(StringBuilder, stringb);
impl_type_builder!(ListBuilder, listb);
impl_type_builder!(UnionBuilder, unionb);
impl_type_builder!(EitherBuilder, eitherb);
impl_type_builder!(StructBuilder, structb);
impl_type_builder!(FuncBuilder, funcb, true);

impl TypeBuilder for RefBuilder {
    fn build(&self) -> Result<TypeId> {
        Ok(crate::Lib::refb(self.name.clone(), self.attributes.clone())?.into())
    }
}
