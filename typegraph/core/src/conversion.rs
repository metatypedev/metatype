// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::{
    FunctionTypeData, IntegerTypeData, ObjectTypeData, TypeNode, TypeNodeBase,
};
use indexmap::IndexMap;

use crate::core::TypeId;
use crate::errors::{self, Result};
use crate::types::{Integer, Struct, T};
use crate::{global_store::Store, typegraph::TypegraphContext, types::Func};

pub fn convert_integer(
    _c: &mut TypegraphContext,
    _tg: &Store,
    id: u32,
    data: &Integer,
) -> Result<TypeNode> {
    Ok(TypeNode::Integer {
        base: gen_base(format!("integer_{id}")),
        data: IntegerTypeData {
            minimum: data.1.min,
            maximum: data.1.max,
            exclusive_minimum: None,
            exclusive_maximum: None,
            multiple_of: None,
        },
    })
}

pub fn convert_struct(
    c: &mut TypegraphContext,
    s: &Store,
    id: u32,
    data: &Struct,
) -> Result<TypeNode> {
    Ok(TypeNode::Object {
        base: gen_base(format!("object_{id}")),
        data: ObjectTypeData {
            properties: data
                .1
                .props
                .iter()
                .map(|(name, type_id)| -> Result<(String, TypeId)> {
                    let id = s.resolve_proxy(*type_id)?;
                    Ok((name.clone(), c.register_type(s, id)?))
                })
                .collect::<Result<IndexMap<_, _>>>()?,
            required: Vec::new(),
        },
    })
}

pub fn convert_func(c: &mut TypegraphContext, s: &Store, id: u32, data: &Func) -> Result<TypeNode> {
    let input = s.resolve_proxy(data.1.inp)?;
    match s.get_type(input)? {
        T::Struct(_) => (),
        _ => return Err(errors::invalid_input_type(&s.get_type_repr(input)?)),
    }
    let input = c.register_type(s, input)?;

    Ok(TypeNode::Function {
        base: gen_base(format!("func_{id}")),
        data: FunctionTypeData {
            input,
            output: c.register_type(s, s.resolve_proxy(data.1.out)?)?,
            materializer: 0,
            rate_calls: false,
            rate_weight: None,
        },
    })
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
