// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::interlude::*;

#[derive(Debug)]
pub struct BooleanType {
    pub base: TypeBase,
}

impl TypeNode for Arc<BooleanType> {
    fn base(&self) -> &super::TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "boolean"
    }
}
