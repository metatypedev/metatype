// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[rustfmt::skip]
pub mod sdk;
pub mod type_def;
pub mod type_id;
pub mod type_ref;

use std::rc::Rc;

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
    pub fn id(&self) -> TypeId {
        match self {
            Type::Ref(type_ref) => type_ref.id(),
            Type::Def(type_def) => type_def.id(),
        }
    }

    pub fn name(&self) -> Option<Rc<str>> {
        match self {
            Type::Ref(type_ref) => type_ref.flatten().name,
            Type::Def(_) => None,
        }
    }

    fn repr(&self) -> String {
        match self {
            Type::Ref(typ) => typ.repr(),
            Type::Def(typ) => typ.repr(),
        }
    }
}
