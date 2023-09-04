// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use crate::errors::Result;
use crate::global_store::with_store;
use crate::types::Struct;
use crate::types::Type;
use crate::types::TypeFun;
use crate::types::TypeId;

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
            Type::Struct(s) => {
                Ok(Some(RelationshipSource {
                    wrapper_type: id,
                    model_type: concrete_type,
                    model_type_name: s.base.name.clone().unwrap(), // TODO err
                    cardinality: Cardinality::One,
                }))
            }
            Type::Optional(o) => {
                let inner = s.get_type(o.data.of.into())?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(s) => Ok(Some(RelationshipSource {
                        wrapper_type: id,
                        model_type_name: s.base.name.clone().unwrap(), // TODO err
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
                let inner = s.get_type(a.data.of.into())?.get_concrete_type().unwrap(); // TODO
                match s.get_type(inner)? {
                    Type::Struct(s) => Ok(Some(RelationshipSource {
                        wrapper_type: id,
                        model_type_name: s.base.name.clone().unwrap(), // TODO err
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
                let inner = s.get_type(o.data.of.into())?.get_concrete_type().unwrap(); // TODO
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
                let inner = s.get_type(a.data.of.into())?.get_concrete_type().unwrap(); // TODO
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

pub fn get_id_field(model_id: TypeId) -> Result<String> {
    with_store(|s| {
        let matches = model_id
            .as_struct(s)?
            .data
            .props
            .iter()
            .map(|(k, ty)| -> Result<Option<String>> {
                match s.get_type((*ty).into())? {
                    Type::Integer(i) => Ok(i.base.as_id.then_some(k.clone())),
                    Type::String(i) => Ok(i.base.as_id.then_some(k.clone())),
                    typ => match typ.get_base() {
                        Some(base) => {
                            if base.as_id {
                                Err(format!(
                                    "id must be on type Integer or String, not {}",
                                    typ.get_data().variant_name()
                                ))
                            } else {
                                Ok(None)
                            }
                        }
                        None => Ok(None),
                    },
                }
            })
            .collect::<Result<Vec<Option<String>>>>()?
            .into_iter()
            .filter_map(|x| x)
            .collect::<Vec<_>>();
        match matches.len() {
            0 => Err("no id field found".to_string()),
            1 => Ok(matches.into_iter().next().unwrap()),
            _ => Err("multiple id fields not supported".to_string()),
        }
    })
}

pub fn get_type_name(type_id: TypeId) -> Result<String> {
    with_store(|s| s.get_type_name(type_id).map(|n| n.map(|n| n.to_string())))?
        .ok_or_else(|| "prisma model must be named".to_string())
}

pub struct RuntimeConfig<'a>(Cow<'a, [(String, String)]>);

impl<'a> RuntimeConfig<'a> {
    pub fn new(config: Option<&'a Vec<(String, String)>>) -> Self {
        Self(match config {
            Some(config) => Cow::Borrowed(config.as_slice()),
            None => Cow::Owned(vec![]),
        })
    }

    pub fn get<T>(&self, key: &str) -> Result<Option<T>>
    where
        T: serde::de::DeserializeOwned,
    {
        self.0
            .iter()
            .filter_map(|(k, v)| if k == key { Some(v) } else { None })
            .last()
            .map(|v| serde_json::from_str(v))
            .transpose()
            .map_err(|e| format!("invalid config value for {}: {}", key, e).into())
    }
}

impl<'a> TryFrom<&'a Type> for RuntimeConfig<'a> {
    type Error = crate::wit::core::Error;

    fn try_from(typ: &'a Type) -> Result<Self> {
        Ok(Self::new(
            typ.get_base()
                .ok_or_else(|| "concrete type required for runtime config".to_string())?
                .runtime_config
                .as_ref(),
        ))
    }
}
