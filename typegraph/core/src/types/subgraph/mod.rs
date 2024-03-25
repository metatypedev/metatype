// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;

use super::TypeId;
mod map;

pub struct Subgraph {
    root: TypeId,
}

impl Subgraph {
    pub fn new(root: TypeId) -> Self {
        Self { root }
    }

    pub fn map<M>(self, mapper: M) -> Result<TypeId>
    where
        M: Fn(TypeId) -> Result<TypeId>,
    {
        map::map(self.root, mapper)
    }
}
