// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use crate::errors::Result;
use crate::types::Type;
use crate::types::TypeAttributes;
use crate::types::TypeFun;
use crate::types::TypeId;

use super::relationship::Cardinality;

impl TypeAttributes {
    pub fn is_unique_ref(&self) -> Result<bool> {
        let typ = self.concrete_type.as_type()?;
        let base = typ.get_base().unwrap();
        Ok(base
            .runtime_config
            .iter()
            .flatten()
            .find_map(|(k, v)| (k == "unique").then(|| v == "true"))
            .unwrap_or(false)
            || self
                .proxy_data
                .iter()
                .find_map(|(k, v)| (k == "unique").then(|| v == "true"))
                .unwrap_or(false))
    }
}

pub fn as_relationship_target(
    concrete_type: TypeId,
    cardinality: Option<Cardinality>,
) -> Result<Option<(TypeId, Cardinality)>> {
    match concrete_type.as_type()? {
        Type::Struct(_) => Ok(Some((
            concrete_type,
            cardinality.unwrap_or(Cardinality::One),
        ))),
        Type::Optional(inner) => {
            let concrete_type = TypeId(inner.data.of).attrs()?.concrete_type;
            if cardinality.is_some() {
                return Err("nested optional/list not supported".to_string());
            }
            as_relationship_target(concrete_type, Some(Cardinality::Optional))
        }
        Type::Array(inner) => {
            let concrete_type = TypeId(inner.data.of).attrs()?.concrete_type;
            if cardinality.is_some() {
                return Err("nested optional/list not supported".to_string());
            }
            as_relationship_target(concrete_type, Some(Cardinality::Many))
        }
        _ => Ok(None),
    }
}

pub fn get_id_field(model_id: TypeId) -> Result<String> {
    let matches = model_id
        .as_struct()?
        .iter_props()
        .map(|(k, ty)| -> Result<Option<String>> {
            match ty.as_type()? {
                Type::Integer(i) => Ok(i.base.as_id.then_some(k.to_string())),
                Type::String(i) => Ok(i.base.as_id.then_some(k.to_string())),
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
        .flatten()
        .collect::<Vec<_>>();
    match matches.len() {
        0 => Err("no id field found".to_string()),
        1 => Ok(matches.into_iter().next().unwrap()),
        _ => Err("multiple id fields not supported".to_string()),
    }
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
            .map_err(|e| format!("invalid config value for {}: {}", key, e))
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
