// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::types::{ExtendedTypeDef, TypeId};
use enum_dispatch::enum_dispatch;
use std::rc::Rc;
use tg_schema::{TypeNode, TypeNodeBase};

#[enum_dispatch]
pub trait TypeConversion {
    /// takes already converted runtime id
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode>;
}

impl<T: TypeConversion> TypeConversion for Rc<T> {
    fn convert(&self, ctx: &mut TypegraphContext, xdef: ExtendedTypeDef) -> Result<TypeNode> {
        (**self).convert(ctx, xdef)
    }
}

pub struct BaseBuilderInit {
    pub base_name: &'static str,
    pub type_id: TypeId,
    pub name: Option<String>,
}

pub struct BaseBuilder {
    name: String,
    // optional features
    enumeration: Option<Vec<String>>,
}

impl BaseBuilderInit {
    pub fn init_builder(self) -> Result<BaseBuilder> {
        let name = match self.name {
            Some(name) => name,
            None => format!("{}_{}_placeholder", self.base_name, self.type_id.0),
        };

        Ok(BaseBuilder {
            name,
            enumeration: None,
        })
    }
}

impl BaseBuilder {
    pub fn build(self) -> Result<TypeNodeBase> {
        Ok(TypeNodeBase {
            description: None,
            enumeration: self.enumeration,
            title: self.name,
        })
    }

    pub fn enum_<T: std::fmt::Display>(mut self, enumeration: Option<&[T]>) -> Self {
        self.enumeration =
            enumeration.map(|enumeration| enumeration.iter().map(|v| format!("{v}")).collect());
        self
    }
}
