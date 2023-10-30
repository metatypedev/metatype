// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::global_store::Store;
use crate::types::{Type, TypeId};
use crate::wit::core::TypeFunc;
use crate::{errors, Result};

impl TypeFunc {
    pub fn validate(&self) -> Result<()> {
        if let Ok(inp_id) = TypeId(self.inp).resolve_proxy() {
            let inp_type = inp_id.as_type()?;
            let Type::Struct(_) = inp_type else {
                return Err(errors::invalid_input_type(&inp_id.repr()?));
            };
        }

        let mat = Store::get_materializer(self.mat)?;
        mat.validate(self)?;

        Ok(())
    }
}

pub fn validate_value(value: &serde_json::Value, type_id: TypeId, path: String) -> Result<()> {
    let attrs = type_id.attrs()?;
    let typ = attrs.concrete_type.as_type()?;
    match typ {
        Type::Func(_) => Err("cannot validate function".into()),

        Type::Struct(inner) => {
            let Some(value) = value.as_object() else {
                return Err(format!(
                    "expected object at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            for (key, type_id) in inner.iter_props() {
                validate_value(
                    value.get(key).unwrap_or(&serde_json::Value::Null),
                    type_id,
                    format!("{path}.{key}"),
                )?;
            }
            // TODO min max?
            Ok(())
        }

        Type::List(inner) => {
            let Some(value) = value.as_array() else {
                return Err(format!(
                    "expected array at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            for (i, value) in value.iter().enumerate() {
                validate_value(value, inner.data.of.into(), format!("{path}[{i}]"))?;
            }
            // TODO min max?
            Ok(())
        }

        Type::Optional(inner) => {
            if value.is_null() {
                return Ok(());
            }
            validate_value(value, inner.data.of.into(), path)?;
            Ok(())
        }

        Type::Either(inner) => {
            let mut match_count = 0;
            for type_id in inner.data.variants.iter() {
                match validate_value(value, type_id.into(), path.clone()) {
                    Ok(()) => match_count += 1,
                    Err(_) => continue,
                }
            }
            match match_count {
                0 => Err(format!(
                    "value {} at {path:?} does not match any of the variants of the either",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into()),
                1 => Ok(()),
                _ => Err(format!(
                    "value {} at {path:?} matches multiple variants of the either",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into()),
            }
        }

        Type::Union(inner) => {
            for type_id in inner.data.variants.iter() {
                match validate_value(value, type_id.into(), path.clone()) {
                    Ok(()) => return Ok(()),
                    Err(_) => continue,
                }
            }
            Err(format!(
                "value {} at {path:?} does not match any of the variants of the union",
                serde_json::to_string(&value).map_err(|e| e.to_string())?,
            )
            .into())
        }

        Type::String(_inner) => {
            let Some(_value) = value.as_str() else {
                return Err(format!(
                    "expected string at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            // TODO min max
            Ok(())
        }

        Type::Integer(_inner) => {
            let Some(_value) = value.as_i64() else {
                return Err(format!(
                    "expected integer at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            // TODO min max
            Ok(())
        }

        Type::Float(_inner) => {
            let Some(_value) = value.as_f64() else {
                return Err(format!(
                    "expected float at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            // TODO min max
            Ok(())
        }

        Type::Boolean(_inner) => {
            let Some(_) = value.as_bool() else {
                return Err(format!(
                    "expected boolean at {path:?}, got: {}",
                    serde_json::to_string(&value).map_err(|e| e.to_string())?,
                )
                .into());
            };
            Ok(())
        }

        _ => unreachable!(),
    }
}

pub(super) mod utils {
    use crate::types::TypeId;

    use super::*;

    pub fn is_equal(left: TypeId, right: TypeId) -> Result<bool> {
        if left == right {
            Ok(true)
        } else {
            match left.resolve_proxy() {
                Ok(left_id) => Ok(right
                    .resolve_proxy()
                    .map_or(left_id == right, |right_id| left_id == right_id)),

                // left is a proxy that could not be resolved
                // -> right must be a proxy for the types to be equal
                Err(_) => match (left.as_type()?, right.as_type()?) {
                    (Type::Proxy(left_proxy), Type::Proxy(right_proxy)) => {
                        Ok(left_proxy.data.name == right_proxy.data.name)
                    }
                    _ => Ok(false),
                },
            }
        }
    }
}
