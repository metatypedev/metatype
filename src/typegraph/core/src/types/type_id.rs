// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::sdk::core::TypeId as CoreTypeId;
use crate::typegraph::TypegraphContext;
use crate::types::AsTypeDefEx as _;
use std::fmt::Debug;

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

    pub fn hash_child_type(
        &self,
        state: &mut crate::conversion::hash::Hasher,
        tg: &mut TypegraphContext,
    ) -> Result<()> {
        let xdef = self.as_xdef()?;
        xdef.hash_type(state, tg)
    }
}

// impl TryFrom<TypeId> for TypeDef {
//     type Error = TgError;
//
//     fn try_from(type_id: TypeId) -> std::result::Result<Self, Self::Error> {
//         Ok(type_id.resolve_ref()?.0)
//     }
// }
