// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::dedup::DupKey;

#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeKey(pub u32, pub u32); // Type idx and an variant id (duplicate id)

impl TypeKey {
    pub fn original(&self) -> Self {
        Self(self.0, 0)
    }
}

impl std::fmt::Debug for TypeKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Ty_{}/{}", self.0, self.1)
    }
}

#[derive(Debug, PartialEq)]
pub struct TypeKeyEx<K: DupKey>(pub u32, pub K);
