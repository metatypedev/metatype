// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::errors::TgError;
use crate::sdk::core::{
    Handler, TypeEither, TypeFloat, TypeFunc, TypeInteger, TypeList, TypeOptional, TypeString,
    TypeStruct, TypeUnion,
};
use crate::types::RefAttr;
use crate::types::TypeRefBuilder;
use crate::types::{Named as _, TypeId, TypeRef};

#[cfg(test)]
use common::typegraph::{Injection, InjectionData, SingleValue};

pub trait TypeBuilder {
    fn build(&self) -> Result<TypeId>;

    fn optional(&self) -> Result<OptionalBuilder> {
        Ok(optional(self.build()?))
    }

    fn build_named(&self, name: impl Into<String>) -> Result<TypeId> {
        Ok(self.build()?.named(name)?.id())
    }

    #[cfg(test)]
    fn as_id(&self) -> Result<TypeRef> {
        use crate::types::type_ref::AsId;
        self.build()?.as_id(false)
    }

    #[cfg(test)]
    fn inject(&self, injection: Injection) -> Result<TypeRef> {
        use crate::types::type_ref::WithInjection;
        self.build()?.with_injection(injection)
    }

    #[cfg(test)]
    fn set_value<V: serde::ser::Serialize>(&mut self, val: V) -> Result<TypeRef> {
        self.inject(Injection::Static(InjectionData::SingleValue(SingleValue {
            value: serde_json::to_value(&val).unwrap(),
        })))
    }

    #[cfg(test)]
    fn config(
        self,
        key: impl Into<String>,
        value: impl serde::ser::Serialize,
    ) -> Result<TypeRefBuilder>
    where
        Self: Sized,
    {
        Ok(TypeRef::from_type(
            self.build()?.as_type()?,
            RefAttr::runtime("", serde_json::json!({key.into(): value})),
        ))
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

impl TypeBuilder for TypeRef {
    fn build(&self) -> Result<TypeId> {
        Ok(self.id())
    }
}

impl<T> TypeBuilder for Result<T>
where
    T: TypeBuilder,
{
    fn build(&self) -> Result<TypeId, TgError> {
        self.as_ref().map_err(|e| e.clone())?.build()
    }
}

#[derive(Default)]
pub struct BooleanBuilder;

pub fn boolean() -> BooleanBuilder {
    Default::default()
}

#[derive(Default)]
pub struct IntegerBuilder {
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
pub(crate) use unionx;

#[derive(Default)]
pub struct EitherBuilder {
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
    }
    .build()
}

pub struct RefBuilder {
    name: String,
    attribute: Option<RefAttr>,
}

pub fn ref_(name: impl Into<String>, attribute: Option<RefAttr>) -> RefBuilder {
    RefBuilder {
        name: name.into(),
        attribute,
    }
}

macro_rules! impl_type_builder {
    ( $ty:ty, $build:ident ) => {
        impl TypeBuilder for $ty {
            fn build(&self) -> Result<TypeId> {
                let res = $crate::Lib::$build(self.data.clone())?;
                Ok(res.into())
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
        let res = crate::Lib::booleanb()?;
        Ok(res.into())
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
        Ok(crate::Lib::refb(
            self.name.clone(),
            self.attribute
                .as_ref()
                .map(|attr| serde_json::to_string(&attr).unwrap()),
        )?
        .into())
    }
}

impl TypeBuilder for TypeRefBuilder {
    fn build(&self) -> Result<TypeId> {
        (*self).clone().register().map(|r| r.id())
    }
}
