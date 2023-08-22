// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::with_store;
use crate::types::Type;
use crate::types::TypeFun;
use crate::wit::core::TypeId;

use super::relationship::{Cardinality, RelationshipSource};

pub fn is_unique_ref(id: TypeId) -> Result<bool> {
    with_store(|s| match s.get_type(id)? {
        Type::Proxy(p) => Ok(p
            .data
            .get_extra("unique")
            .map(serde_json::from_str::<bool>)
            .transpose()
            .map_err(|_e| "invalid 'unique' config: expected string".to_string())?
            .unwrap_or(false)),
        _ => Ok(false),
    })
}

pub fn has_fkey(id: TypeId) -> Result<Option<bool>> {
    with_store(|s| match s.get_type(id)? {
        Type::Proxy(p) => p
            .data
            .get_extra("fkey")
            .map(serde_json::from_str)
            .transpose()
            .map_err(|_| "invalid 'fkey' field".to_string()),
        _ => Ok(None),
    })
}

pub fn as_relationship_source(id: TypeId) -> Result<Option<RelationshipSource>> {
    with_store(|s| {
        let concrete_type = s
            .get_type(id)?
            .get_concrete_type()
            .ok_or_else(|| "cannot resolve ref".to_string())?;
        match s.get_type(concrete_type)? {
            Type::Struct(_) => Ok(Some(RelationshipSource {
                wrapper_type: id,
                model_type: concrete_type,
                cardinality: Cardinality::One,
            })),
            Type::Optional(o) => {
                let inner = s.get_type(o.data.of)?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(_) => Ok(Some(RelationshipSource {
                        wrapper_type: id,
                        model_type: inner,
                        cardinality: Cardinality::Optional,
                    })),
                    // TODO less strict?
                    Type::Optional(_) | Type::Array(_) => {
                        Err("nested optional/list not supported".to_string())
                    }
                    // scalar type
                    _ => Ok(None),
                }
            }

            Type::Array(a) => {
                let inner = s.get_type(a.data.of)?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(_) => Ok(Some(RelationshipSource {
                        wrapper_type: id,
                        model_type: inner,
                        cardinality: Cardinality::Many,
                    })),
                    // TODO less strict?
                    Type::Optional(_) | Type::Array(_) => {
                        Err("nested optional/list not supported".to_string())
                    }
                    // scalar type
                    _ => Ok(None),
                }
            }

            // scalar type or union
            _ => Ok(None),
        }
    })
}

pub fn get_model_type(wrapper_type: TypeId) -> Result<Option<(TypeId, Cardinality)>> {
    with_store(|s| {
        let concrete_type = s.get_type(wrapper_type)?.get_concrete_type().unwrap(); // TODO
        match s.get_type(concrete_type)? {
            Type::Struct(_) => Ok(Some((concrete_type, Cardinality::One))),
            Type::Optional(o) => {
                let inner = s.get_type(o.data.of)?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(_) => Ok(Some((inner, Cardinality::Optional))),
                    // TODO less strict?
                    Type::Optional(_) | Type::Array(_) => {
                        Err("nested optional/list not supported".to_string())
                    }
                    // scalar type
                    _ => Ok(None),
                }
            }
            Type::Array(a) => {
                let inner = s.get_type(a.data.of)?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(_) => Ok(Some((inner, Cardinality::Many))),
                    // TODO less strict?
                    Type::Optional(_) | Type::Array(_) => {
                        Err("nested optional/list not supported".to_string())
                    }
                    // scalar type
                    _ => Ok(None),
                }
            }
            // scalar type
            _ => Ok(None),
        }
    })
}
