// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::BorrowMut;

use crate::{
    conversion::types::TypeConversion,
    errors::{self, Result},
    global_store::{with_store, Store},
    typegraph::TypegraphContext,
    types::{Type, TypeData, WithApply, WrapperTypeData},
    wit::core::{Core, TypeBase, TypeFuncWithApply, TypeStruct},
    Lib,
};
use common::typegraph::TypeNode;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApplyValue {
    Set(Value),
    Inherit(Vec<String>),
}

impl TypeConversion for WithApply {
    fn convert(&self, ctx: &mut TypegraphContext, runtime_id: Option<u32>) -> Result<TypeNode> {
        with_store(|s| -> Result<_> {
            let tpe = s.get_type(self.data.tpe_func)?;
            let mut type_node = tpe.convert(ctx, runtime_id)?;
            match type_node.borrow_mut() {
                TypeNode::Function { data, .. } => {
                    data.input =
                        build_applied_input(ctx, data.input, self.data.apply_value.clone())?
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

fn convert_applied_input_as_type(
    _ctx: &mut TypegraphContext,
    supertype_id: u32,
    root: serde_json::Value,
    depth: u32,
) -> Result<u32> {
    with_store(|s| {
        match root {
            Value::Object(ref props) => {
                let mut new_props = vec![];
                for (k, _v) in props.iter() {
                    // check if ApplyValue leaf
                    if (k.eq("inherit") || k.eq("set")) && depth != 0 && props.len() == 1 {
                        let value: Result<ApplyValue, String> =
                            serde_json::from_value(root.clone()).map_err(|e| e.to_string());
                        if let Ok(value) = value {
                            match value {
                                ApplyValue::Inherit(path) => {
                                    let (_, inherit_id) =
                                        s.get_type_by_path(supertype_id, &path)?;
                                    new_props.push((k.clone(), inherit_id));
                                }
                                ApplyValue::Set(_set) => {
                                    /* create new type, with static injection */
                                }
                            }
                        }
                    }
                    // let _new_id =
                    //     convert_applied_input_as_type(ctx, supertype_id, v.clone(), depth + 1)?;
                    // TODO: wrap with injection
                    // new_props.push((k.clone(), _new_id));
                }

                let _gen_id = Lib::structb(
                    TypeStruct {
                        props: new_props.clone(),
                    },
                    TypeBase {
                        ..Default::default()
                    },
                )?;
                // Ok(gen_id)
            }
            value => return Err(format!("expected object, got {:?}", value)),
        }
        // build root TypeStruct
        Ok(0) // return new id
    })
}

fn build_applied_input(
    ctx: &mut TypegraphContext,
    input_id: u32,
    apply_value: String,
) -> Result<u32> {
    let root: Value = serde_json::from_str(&apply_value).unwrap();

    let _new_id = convert_applied_input_as_type(ctx, input_id, root, 0)?;

    Ok(input_id) // should be new_id
}
