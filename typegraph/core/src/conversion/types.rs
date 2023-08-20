// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    /// takes already converted runtime id
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode>;
}

/// takes converted runtime id
pub fn gen_base(name: String, runtime_id: u32) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration: None,
        injection: None,
        policies: Vec::new(),
        runtime: runtime_id,
        title: name,
        as_id: false,
    }
}

pub fn gen_base_enum(name: String, runtime_id: u32, enumeration: Option<Vec<String>>) -> TypeNodeBase {
    TypeNodeBase {
        enumeration,
        ..gen_base(name, runtime_id)
    }
}
