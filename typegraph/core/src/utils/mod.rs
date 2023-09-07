// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::with_store,
    wit::core::{Core, TypeBase, TypeId, TypeStruct},
    Lib,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApplyValue {
    Set(Value),
    Inherit(Vec<String>),
}

pub fn convert_applied_input_as_type(
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
                    //     convert_applied_input_as_type(supertype_id, v.clone(), depth + 1)?;
                    // TODO: wrap with injection
                    // new_props.push((k.clone(), _new_id));
                }

                // Ok(gen_id)
            }
            value => return Err(format!("expected object, got {:?}", value)),
        }

        Ok(0)
    })
}

impl crate::wit::utils::Utils for crate::Lib {
    fn gen_applyb(supertype_id: TypeId, apply_json: String) -> Result<TypeId> {
        let root: Value = serde_json::from_str(&apply_json).map_err(|e| e.to_string())?;
        let _new_id = convert_applied_input_as_type(supertype_id, root, 0)?;
        // Note: if used out of scope even with proper imports Lib::some_type() panics
        let example = Lib::structb(TypeStruct { props: vec![] }, TypeBase::default())?;
        Ok(example)
    }
}
