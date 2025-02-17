// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::Arc;

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct IntegerType {
    pub base: TypeBase,
    pub minimum: Option<i32>,
    pub maximum: Option<i32>,
    pub exclusive_minimum: Option<i32>,
    pub exclusive_maximum: Option<i32>,
    pub multiple_of: Option<i32>,
}

impl TypeNode for Arc<IntegerType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "integer"
    }
}

impl IntegerType {
    pub fn is_plain(&self) -> bool {
        match (
            self.minimum,
            self.maximum,
            self.exclusive_minimum,
            self.exclusive_maximum,
            self.multiple_of,
        ) {
            (None, None, None, None, None) => true,
            _ => false,
        }
    }
}
