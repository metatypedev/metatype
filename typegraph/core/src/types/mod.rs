// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod type_def;
pub mod type_id;
pub mod type_ref;

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
    fn name(&self) -> Option<&str> {
        match self {
            Type::Ref(typ) => Some(typ.name.as_str()),
            Type::Def(typ) => typ.name(),
        }
    }

    fn repr(&self) -> String {
        match self {
            Type::Ref(typ) => typ.repr(),
            Type::Def(typ) => typ.repr(),
        }
    }
}
