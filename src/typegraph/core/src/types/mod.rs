// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
pub mod aws;
pub mod builders;
#[allow(unused)]
pub mod core;
#[allow(unused)]
pub mod runtimes;
pub mod type_def;
pub mod type_id;
pub mod type_ref;
#[allow(unused)]
pub mod utils;

use std::borrow::Cow;

pub use type_def::*;
pub use type_id::*;
pub use type_ref::*;

use crate::{errors::Result, types::core::TypeId as CoreTypeId};

#[derive(Clone, Debug)]
pub enum Type {
    Ref(TypeRef),
    Def(TypeDef),
}

impl From<TypeRef> for Type {
    fn from(r: TypeRef) -> Self {
        Self::Ref(r)
    }
}

impl From<TypeDef> for Type {
    fn from(d: TypeDef) -> Self {
        Self::Def(d)
    }
}

impl Type {
    fn name(&self) -> Option<Cow<'_, str>> {
        match self {
            Type::Ref(typ) => match typ.flatten().target {
                FlatTypeRefTarget::Direct(type_def) => {
                    type_def.name().map(ToString::to_string).map(Into::into)
                }
                FlatTypeRefTarget::Indirect(name) => Some(name.into()),
            },
            Type::Def(typ) => typ.name().map(Into::into),
        }
    }

    fn repr(&self) -> String {
        match self {
            Type::Ref(typ) => typ.repr(),
            Type::Def(typ) => typ.repr(),
        }
    }
}

pub fn get_type_repr(type_id: CoreTypeId) -> Result<String> {
    TypeId(type_id).repr()
}
