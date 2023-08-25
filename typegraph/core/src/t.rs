// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::types::TypeId;
use crate::wit::core::{Core, TypeArray, TypeBase, TypeInteger, TypeOptional, TypeStruct};

pub trait TypeBuilder {
    fn build(&mut self) -> Result<TypeId>;
}

pub trait ConcreteTypeBuilder: TypeBuilder {
    fn base_mut(&mut self) -> &mut TypeBase;

    fn named(&mut self, name: impl Into<String>) -> &mut Self {
        self.base_mut().name = Some(name.into());
        self
    }
}

#[derive(Default)]
pub struct IntegerBuilder {
    base: TypeBase,
    data: TypeInteger,
}

impl Default for TypeInteger {
    fn default() -> Self {
        Self {
            ..Default::default()
        }
    }
}

pub fn integer() -> IntegerBuilder {
    Default::default()
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
            ..Default::default()
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
pub struct StructBuilder {
    base: TypeBase,
    data: TypeStruct,
}

impl Default for TypeStruct {
    fn default() -> Self {
        Self { props: Vec::new() }
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
}

impl_type_builder!(IntegerBuilder, integerb);
impl_type_builder!(OptionalBuilder, optionalb);
impl_type_builder!(ArrayBuilder, arrayb);
impl_type_builder!(StructBuilder, structb);
