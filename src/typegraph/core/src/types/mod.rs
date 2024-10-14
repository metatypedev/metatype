// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod type_def;
pub mod type_id;
pub mod type_ref;

use std::borrow::Cow;

pub use type_def::*;
pub use type_id::*;
pub use type_ref::*;

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
