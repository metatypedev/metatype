// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::PolicySpec;
use common::typegraph::{Injection, PolicyIndices, TypeNode, TypeNodeBase};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;
use std::rc::Rc;

use crate::errors::Result;
use crate::typegraph::TypegraphContext;
use crate::types::TypeId;

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

pub struct BaseBuilderInit<'a, 'b> {
    pub ctx: &'a mut TypegraphContext,
    pub base_name: &'static str,
    pub type_id: TypeId,
    pub name: Option<String>,
    pub runtime_idx: u32,
    pub policies: &'b [PolicySpec],
    pub runtime_config: Option<&'b [(String, String)]>,
}

pub struct BaseBuilder<'a> {
    ctx: &'a mut TypegraphContext,
    name: String,
    runtime_idx: u32,
    policies: Vec<PolicyIndices>,
    runtime_config: Option<IndexMap<String, String>>,

    // optional features
    enumeration: Option<Vec<String>>,
    injection: Option<Injection>,
    as_id: bool,
}

impl<'a, 'b> BaseBuilderInit<'a, 'b> {
    pub fn init_builder(self) -> Result<BaseBuilder<'a>> {
        let policies = self.ctx.register_policy_chain(self.policies)?;

        let name = self
            .name
            .unwrap_or_else(|| format!("{}_{}", self.base_name, self.type_id.0));

        let runtime_config = self.runtime_config.map(|c| {
            c.iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect::<IndexMap<_, _>>()
        });

        Ok(BaseBuilder {
            ctx: self.ctx,
            name,
            runtime_idx: self.runtime_idx,
            policies,
            runtime_config,

            enumeration: None,
            injection: None,
            as_id: false,
        })
    }
}

impl<'a> BaseBuilder<'a> {
    pub fn build(self) -> Result<TypeNodeBase> {
        let config = self.runtime_config.map(|c| {
            c.iter()
                .map(|(k, v)| (k.to_string(), serde_json::from_str(v).unwrap()))
                .collect::<IndexMap<_, _>>()
        });

        Ok(TypeNodeBase {
            config: config.unwrap_or_default(),
            description: None,
            enumeration: self.enumeration,
            injection: self.injection,
            policies: self.policies,
            runtime: self.runtime_idx,
            title: self.name,
            as_id: self.as_id,
        })
    }

    pub fn enum_<T: std::fmt::Display>(mut self, enumeration: Option<&[T]>) -> Self {
        self.enumeration =
            enumeration.map(|enumeration| enumeration.iter().map(|v| format!("{v}")).collect());
        self
    }

    // TODO use a wit generated injection type; the this will be a in-place mutation
    fn convert_injection(&mut self, mut injection: Injection) -> Result<Injection> {
        if let Injection::Parent(data) = &mut injection {
            for type_id in data.values_mut().into_iter() {
                let type_def = TypeId(*type_id).resolve_ref()?.1;
                *type_id = self
                    .ctx
                    .register_type(type_def, Some(self.runtime_idx))?
                    .into();
            }
        }

        Ok(injection)
    }

    pub fn inject(mut self, injection: Option<Box<Injection>>) -> Result<Self> {
        self.injection = injection.map(|i| self.convert_injection(*i)).transpose()?;
        Ok(self)
    }

    pub fn id(mut self, b: bool) -> Self {
        self.as_id = b;
        self
    }
}
