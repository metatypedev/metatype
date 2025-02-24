// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::Arc;

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct StringType {
    pub base: TypeBase,
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub format: Option<tg_schema::StringFormat>,
    pub enumeration: Option<Vec<String>>,
}

impl TypeNode for Arc<StringType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "string"
    }
}

impl StringType {
    pub fn is_plain(&self) -> bool {
        match (
            self.min_length,
            self.max_length,
            self.pattern.as_ref(),
            self.format.clone(),
        ) {
            (None, None, None, None) => true,
            _ => false,
        }
    }

    pub fn format_only(&self) -> Option<tg_schema::StringFormat> {
        match (self.min_length, self.max_length, self.pattern.as_ref()) {
            (None, None, None) => self.format.clone(),
            _ => None,
        }
    }
}
