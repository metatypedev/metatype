// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::BorrowMut;

use crate::{
    conversion::types::TypeConversion,
    errors::{self, Result},
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{Type, TypeData, WithApply, WrapperTypeData},
    wit::core::TypeFuncWithApply,
};
use common::typegraph::TypeNode;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApplyValue {
    Set(Value),
    Id(u32),
}

impl TypeConversion for WithApply {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe_func)?;
            let mut type_node = tpe.convert(ctx, runtime_id)?;
            match type_node.borrow_mut() {
                TypeNode::Function { data, .. } => {
                    data.input = build_applied_input(data.input, self.data.apply_value.clone())?
                }
                _ => return Err(errors::expected_typenode_func(type_node.type_name())),
            }
            Ok(type_node)
        })
    }
}

impl TypeData for TypeFuncWithApply {
    fn get_display_params_into(&self, params: &mut Vec<String>) {
        params.push(format!("apply='[{}]'", self.apply_value));
    }

    fn variant_name(&self) -> String {
        "apply".to_string()
    }
}

impl WrapperTypeData for TypeFuncWithApply {
    fn get_wrapped_type<'a>(&self, store: &'a Store) -> Option<&'a Type> {
        store.get_type(self.tpe_func).ok()
    }
}

fn convert_applied_input_as_struct(root: Value) -> Result<u32> {
    match root {
        Value::Object(ref props) => {
            for (k, _v) in props.iter() {
                // check if ApplyValue leaf
                if (k.eq("id") || k.eq("set")) && props.len() == 1 {
                    let value: Result<ApplyValue, String> =
                        serde_json::from_value(root.clone()).map_err(|e| e.to_string());
                    if let Ok(value) = value {
                        match value {
                            ApplyValue::Id(_id) => { /* get canonical index from store id */ }
                            ApplyValue::Set(_set) => { /* create new type, with static injection */
                            }
                        }
                    }
                }
                // traverse_applied_input(v))
            }
        }
        value => return Err(format!("expected object, got {:?}", value)),
    }
    // build root TypeStruct
    Ok(0) // return new id
}

// Examples:
// 1. struct(a, struct(b, c)) is a supertype of itself
// 2. two types are the same regardless of their other attributes, or wrappers(opt, injection)
// struct(a, struct(b, c)) is a supertype of struct(a, struct(c.max(1234))))
// struct(optional(a)) is a supertype of struct(a)
fn validate_supertype(_left_id: u32, _right_id: u32) -> Result<()> {
    // TODO:
    Ok(())
}

fn build_applied_input(input_id: u32, apply_value: String) -> Result<u32> {
    let root: Value = serde_json::from_str(&apply_value).unwrap();

    let new_id = convert_applied_input_as_struct(root)?;

    validate_supertype(input_id, new_id)?;

    Ok(input_id) // should be new_id
}
