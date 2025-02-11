// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct BooleanType {
    pub base: TypeBase,
}

impl TypeNode for BooleanType {
    fn base(&self) -> &super::TypeBase {
        &self.base
    }
}
