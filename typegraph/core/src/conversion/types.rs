// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{
    ArrayTypeData, EitherTypeData, FunctionTypeData, IntegerTypeData, NumberTypeData,
    ObjectTypeData, OptionalTypeData, StringFormat, StringTypeData, TypeNode, TypeNodeBase,
    UnionTypeData,
};
use enum_dispatch::enum_dispatch;
use indexmap::IndexMap;

use crate::errors::{self, Result};
use crate::global_store::with_store;
use crate::types::{
    Array, Boolean, Either, Integer, Number, Optional, Proxy, StringT, Struct, Type, Union,
    WithPolicy,
};
use crate::wit::core::TypeId;
use crate::{typegraph::TypegraphContext, types::Func};

#[enum_dispatch]
pub trait TypeConversion {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode>;
}

impl TypeConversion for Integer {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Integer {
            base: gen_base_enum(
                format!("integer_{}", self.id),
                self.data.enumeration.clone(),
            ),
            data: IntegerTypeData {
                minimum: self.data.min,
                maximum: self.data.max,
                exclusive_minimum: self.data.exclusive_minimum,
                exclusive_maximum: self.data.exclusive_maximum,
                multiple_of: self.data.multiple_of,
            },
        })
    }
}

impl TypeConversion for Number {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Number {
            base: gen_base_enum(format!("number_{}", self.id), self.data.enumeration.clone()),
            data: NumberTypeData {
                minimum: self.data.min,
                maximum: self.data.max,
                exclusive_minimum: self.data.exclusive_minimum,
                exclusive_maximum: self.data.exclusive_maximum,
                multiple_of: self.data.multiple_of,
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

impl TypeConversion for StringT {
    fn convert(&self, _ctx: &mut TypegraphContext) -> Result<TypeNode> {
        let format: Option<StringFormat> = match self.data.format.clone() {
            Some(format) => {
                let ret =
                    serde_json::from_str(&format!("{:?}", format)).map_err(|e| e.to_string())?;
                Some(ret)
            }
            None => None,
        };
        Ok(TypeNode::String {
            base: gen_base_enum(format!("string_{}", self.id), self.data.enumeration.clone()),
            data: StringTypeData {
                min_length: self.data.min,
                max_length: self.data.max,
                pattern: self.data.pattern.to_owned(),
                format,
            },
        })
    }
}

impl TypeConversion for Array {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Array {
            base: gen_base(format!("array_{}", self.id)),
            data: ArrayTypeData {
                items: with_store(|s| -> Result<_> {
                    let id = s.resolve_proxy(self.data.of)?;
                    ctx.register_type(s, id)
                })?,
                max_items: self.data.max,
                min_items: self.data.min,
                unique_items: self.data.unique_items,
            },
        })
    }
}

impl TypeConversion for Optional {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        let default_value = match self.data.default_item.clone() {
            Some(value) => {
                let ret = serde_json::from_str(&value).map_err(|s| s.to_string())?;
                Some(ret)
            }
            None => None,
        };

        Ok(TypeNode::Optional {
            base: gen_base(format!("optional_{}", self.id)),
            data: OptionalTypeData {
                item: with_store(|s| -> Result<_> {
                    let id = s.resolve_proxy(self.data.of)?;
                    ctx.register_type(s, id)
                })?,
                default_value,
            },
        })
    }
}

impl TypeConversion for Union {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Union {
            base: gen_base(format!("union_{}", self.id)),
            data: UnionTypeData {
                any_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy(*vid)?;
                            ctx.register_type(s, id)
                        })
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
        })
    }
}

impl TypeConversion for Either {
    fn convert(&self, ctx: &mut TypegraphContext) -> Result<TypeNode> {
        Ok(TypeNode::Either {
            base: gen_base(format!("either_{}", self.id)),
            data: EitherTypeData {
                one_of: self
                    .data
                    .variants
                    .iter()
                    .map(|vid| {
                        with_store(|s| -> Result<_> {
                            let id = s.resolve_proxy(*vid)?;
                            ctx.register_type(s, id)
                        })
                    })
                    .collect::<Result<Vec<_>>>()?,
            },
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
