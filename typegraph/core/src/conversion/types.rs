// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode>;
}

pub fn gen_base(name: String) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration: None,
        // injection: Some(Injection::Static(InjectionData::SingleValue(SingleValue {
        //     value: "-1".to_owned(),
        // }))),
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
        as_id: false,
    }
}

pub fn gen_base_enum(name: String, enumeration: Option<Vec<String>>) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration,
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
        as_id: false,
    }
}
