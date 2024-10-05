// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{RefTarget, ResolveRef as _, TypeDefExt};
use super::{Type, TypeDef};
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
        let typ = self.as_type()?;
        match typ.to_ref_target() {
            RefTarget::Direct(type_def) => {
                if let Some(name) = type_def.base().name.as_deref() {
                    "named".hash(state);
                    name.hash(state);
                } else {
                    tg.hash_type(type_def, runtime_id)?.hash(state)
                }
            }
            RefTarget::Indirect(name) => {
                "named".hash(state);
                name.hash(state);
            }
        }
        if let Type::Ref(type_ref) = typ {
            "attributes".hash(state);
            let mut sorted_attributes = type_ref.attributes.iter().collect::<Vec<_>>();
            sorted_attributes.sort_by_key(|(k, _)| k.to_string());
            sorted_attributes.hash(state);
        }

        Ok(())
    }
}

impl TryFrom<TypeId> for TypeDef {
    type Error = TgError;

    fn try_from(type_id: TypeId) -> std::result::Result<Self, Self::Error> {
        Ok(type_id.resolve_ref()?.0)
    }
}
