// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct StringType {
    pub base: TypeBase,
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub format: Option<tg_schema::StringFormat>,
}

impl TypeNode for StringType {
    fn base(&self) -> &TypeBase {
        &self.base
    }
}
