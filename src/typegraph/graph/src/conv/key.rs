// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{Type, TypeNodeExt as _};

use super::dedup::DuplicationKey;

#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeKey(pub u32, pub u32); // Type idx and an variant id (duplicate id)

impl std::fmt::Debug for TypeKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Ty_{}/{}", self.0, self.1)
    }
}

#[derive(Debug, PartialEq)]
pub struct TypeKeyEx(pub u32, pub DuplicationKey);

impl From<&Type> for TypeKeyEx {
    fn from(ty: &Type) -> Self {
        Self(ty.idx(), From::from(ty))
    }
}
