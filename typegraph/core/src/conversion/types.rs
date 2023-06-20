// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{
    FunctionTypeData, IntegerTypeData, ObjectTypeData, TypeNode, TypeNodeBase,
};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;

use crate::errors::{self, Result};
use crate::global_store::with_store;
use crate::types::{Boolean, Integer, Proxy, Struct, Type, WithPolicy};
use crate::wit::core::TypeId;
use crate::{typegraph::TypegraphContext, types::Func};

#[enum_dispatch]
pub trait TypeConversion {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode>;
}

impl TypeConversion for Integer {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Integer {
            base: gen_base(format!("integer_{}", self.id)),
            data: IntegerTypeData {
                minimum: self.data.min,
                maximum: self.data.max,
                exclusive_minimum: None,
                exclusive_maximum: None,
                multiple_of: None,
            },
        })
    }
}

impl TypeConversion for Boolean {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Boolean {
            base: gen_base(format!("boolean_{}", self.id)),
        })
    }
}

impl TypeConversion for Struct {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Object {
            base: gen_base(format!("object_{}", self.id)),
            data: ObjectTypeData {
                properties: self
                    .data
                    .props
                    .iter()
                    .map(|(name, type_id)| -> Result<(String, TypeId)> {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy(*type_id)?;
                            Ok((name.clone(), ctx.register_type(s, id)?))
                        })
                    })
                    .collect::<Result<IndexMap<_, _>>>()?,
                required: Vec::new(),
            },
        })
    }
}

impl TypeConversion for Func {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        let input = with_store(|s| -> Result<_> {
            let inp_id = s.resolve_proxy(self.data.inp)?;
            match s.get_type(inp_id)? {
                Type::Struct(_) => Ok(ctx.register_type(s, inp_id)?),
                _ => Err(errors::invalid_input_type(&s.get_type_repr(inp_id)?)),
            }
        })?;

        let output = with_store(|s| -> Result<_> {
            let out_id = s.resolve_proxy(self.data.out)?;
            ctx.register_type(s, out_id)
        })?;

        let materializer =
            with_store(|s| -> Result<_> { ctx.register_materializer(s, self.data.mat) })?;

        Ok(TypeNode::Function {
            base: gen_base(format!("func_{}", self.id)),
            data: FunctionTypeData {
                input,
                output,
                materializer,
                rate_calls: false,
                rate_weight: None,
            },
        })
    }
}

impl TypeConversion for Proxy {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.resolve_proxy(self.id).and_then(|id| s.get_type(id))?;
            tpe.convert(ctx)
        })
    }
}

impl TypeConversion for WithPolicy {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe)?;
            let mut type_node = tpe.convert(ctx)?;
            let base = type_node.base_mut();
            base.policies = ctx.register_policy_chain(&self.data.chain)?;
            Ok(type_node)
        })
    }
}

pub fn gen_base(name: String) -> TypeNodeBase {
    TypeNodeBase {
        config: Default::default(),
        description: None,
        enumeration: None,
        injection: None,
        policies: Vec::new(),
        runtime: 0,
        title: name,
    }
}
