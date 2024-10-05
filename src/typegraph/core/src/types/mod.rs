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
            Type::Ref(typ) => match &typ.target {
                RefTarget::Direct(type_def) => type_def.name(),
                RefTarget::Indirect(name) => Some(name),
            },
            Type::Def(typ) => typ.name(),
        }
    }

    fn repr(&self) -> String {
        match self {
            Type::Ref(typ) => typ.repr(),
            Type::Def(typ) => typ.repr(),
        }
    }

    /// wrap Type::Def in RefTarget, get target from Type::Ref
    pub fn to_ref_target(&self) -> RefTarget {
        match self {
            Type::Ref(type_ref) => type_ref.target.clone(),
            Type::Def(type_def) => RefTarget::Direct(type_def.clone()),
        }
    }
}
