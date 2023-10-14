// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use crate::errors::Result;
use crate::types::Type;
use crate::types::TypeAttributes;
use crate::types::TypeFun;

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
