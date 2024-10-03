// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::TypeDefExt;
use super::{type_ref::RefData, Type, TypeDef};
use crate::errors::Result;
use crate::errors::TgError;
use crate::typegraph::TypegraphContext;
use crate::wit::core::TypeId as CoreTypeId;
use std::fmt::Debug;
use std::hash::Hash as _;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct TypeId(pub CoreTypeId);

impl Debug for TypeId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Type#{}", self.0)
    }
}

impl From<CoreTypeId> for TypeId {
    fn from(id: CoreTypeId) -> Self {
        Self(id)
    }
}

impl From<&CoreTypeId> for TypeId {
    fn from(id: &CoreTypeId) -> Self {
        Self(*id)
    }
}

impl From<TypeId> for CoreTypeId {
    fn from(id: TypeId) -> Self {
        id.0
    }
}

impl From<TypeId> for serde_json::Value {
    fn from(id: TypeId) -> Self {
        id.0.into()
    }
}

impl TypeId {
    pub fn name(&self) -> Result<Option<String>> {
        self.as_type().map(|t| t.name().map(|s| s.to_string()))
    }

    pub fn repr(&self) -> Result<String> {
        let typ = self.as_type()?;
        Ok(typ.repr())
    }

    pub fn resolve_ref(&self) -> Result<(Option<RefData>, TypeDef)> {
        match self.as_type()? {
            Type::Ref(type_ref) => {
                let (ref_data, type_def) = type_ref.resolve_ref()?;
                Ok((Some(ref_data), type_def))
            }
            Type::Def(type_def) => Ok((None, type_def)),
        }
    }

    // resolves to the ref id if a Ref
    // resolves to self if a Def
    // pub fn resolve_ref_id(&self) -> Result<TypeId> {
    //     match self.as_type()? {
    //         Type::Ref(type_ref) => Ok(Store::get_type_by_name(&type_ref.name)
    //             .ok_or_else(|| errors::unregistered_type_name(&type_ref.name))?),
    //         Type::Def(_) => Ok(TypeId(self.0)),
    //     }
    // }

    pub fn as_type_def(&self) -> Result<Option<TypeDef>> {
        match self.as_type()? {
            Type::Ref(_) => Ok(None),
            Type::Def(type_def) => Ok(Some(type_def)),
        }
    }

    pub fn hash_child_type(
        &self,
        state: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
        runtime_id: Option<u32>,
    ) -> Result<()> {
        match self.as_type()? {
            Type::Ref(type_ref) => type_ref.name.hash(state),
            Type::Def(type_def) => {
                if let Some(name) = type_def.base().name.as_deref() {
                    name.hash(state)
                } else {
                    tg.hash_type(type_def, runtime_id)?.hash(state)
                }
            }
        }

        Ok(())
    }
}

impl TryFrom<TypeId> for TypeDef {
    type Error = TgError;

    fn try_from(type_id: TypeId) -> std::result::Result<Self, Self::Error> {
        Ok(type_id.resolve_ref()?.1)
    }
}
