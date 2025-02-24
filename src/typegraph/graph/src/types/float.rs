// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::Arc;

use super::{TypeBase, TypeNode};

#[derive(Debug)]
pub struct FloatType {
    pub base: TypeBase,
    pub minimum: Option<f64>,
    pub maximum: Option<f64>,
    pub exclusive_minimum: Option<f64>,
    pub exclusive_maximum: Option<f64>,
    pub multiple_of: Option<f64>,
}

impl TypeNode for Arc<FloatType> {
    fn base(&self) -> &TypeBase {
        &self.base
    }

    fn tag(&self) -> &'static str {
        "float"
    }
}

impl FloatType {
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
