// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{Injection, PolicyIndices, TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;
use std::rc::Rc;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;

#[enum_dispatch]
pub trait TypeConversion {
    /// takes already converted runtime id
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode>;
}

impl<T: TypeConversion> TypeConversion for Rc<T> {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        (**self).convert(ctx, runtime_id)
    }
}

#[derive(Default)]
pub struct TypeNodeBaseBuilder {
    name: String,
    runtime: u32,
    enumeration: Option<Vec<String>>,
    injection: Option<Injection>,
    policies: Vec<PolicyIndices>,
    runtime_config: Option<Vec<(String, String)>>,
    as_id: bool,
}

/// takes converted runtime id
pub fn gen_base(
    name: String,
    runtime_config: Option<Vec<(String, String)>>,
    runtime_id: u32,
) -> TypeNodeBaseBuilder {
    TypeNodeBaseBuilder {
        name,
        runtime: runtime_id,
        runtime_config,
        ..Default::default()
    }
}

impl TypeNodeBaseBuilder {
    pub fn build(self) -> TypeNodeBase {
        let config = self.runtime_config.map(|c| {
            c.iter()
                .map(|(k, v)| (k.to_string(), serde_json::from_str(v).unwrap()))
                .collect::<IndexMap<_, _>>()
        });

        TypeNodeBase {
            config: config.unwrap_or_default(),
            description: None,
            enumeration: self.enumeration,
            injection: self.injection,
            policies: self.policies,
            runtime: self.runtime,
            title: self.name,
            as_id: self.as_id,
        }
    }

    pub fn enum_(mut self, enumeration: Option<Vec<String>>) -> Self {
        self.enumeration = enumeration;
        self
    }

    pub fn inject(mut self, injection: Option<Box<Injection>>) -> Self {
        self.injection = injection.map(|i| *i);
        self
    }

    pub fn id(mut self, b: bool) -> Self {
        self.as_id = b;
        self
    }
}

/// Instantiate a TypeNodeBaseBuilder.
///
/// To be used in this module only.
///
/// E.g. gen_base_builder!("boolean", typ, runtime_id.unwrap())
macro_rules! gen_base_builder {
    ( $name:expr, $type:expr, $rt:expr ) => {{
        let base = $crate::conversion::types::gen_base(
            $type
                .base
                .name
                .clone()
                .unwrap_or_else(|| format!(concat!($name, "_{}"), $type.id.0)),
            $type.base.runtime_config.clone(),
            $rt,
        );
        base
    }};
}

/// Generate TypeNodeBase from a concrete type.
macro_rules! gen_base_concrete {
    ( $name:expr, $type:expr, $rt:expr ) => {{
        let builder = $crate::conversion::types::gen_base_builder!($name, $type, $rt);
        builder.build()
    }};

    ( $name:expr, $type:expr, $rt:expr, $( $attr:ident ),* ) => {{
        let builder = $crate::conversion::types::gen_base_builder!($name, $type, $rt);

        $(
            let builder = $crate::conversion::types::set_type_attribute!(builder, $type, $attr);
        )*

        builder.build()
    }};
}

/// Set attributes on a TypeNodeBaseBuilder.
///
/// Usage: `set_type_attribute!(builder, typ, <attr-name>)`
///
/// Valid type attributes are the identifiers: `enum`, `injection`, `as_id`.
macro_rules! set_type_attribute {
    ( $builder:expr, $type:expr, enum ) => {{
        let enumeration = $type
            .data
            .enumeration
            .clone()
            .map(|enums| enums.iter().map(|v| format!("{}", v)).collect());
        $builder.enum_(enumeration)
    }};

    ( $builder:expr, $type:expr, injection ) => {
        $builder.inject($type.extended_base.injection.clone())
    };

    ( $builder:expr, $type:expr, as_id ) => {
        $builder.id($type.base.as_id)
    };
}

pub(crate) use gen_base_builder;
pub(crate) use gen_base_concrete;
pub(crate) use set_type_attribute;
