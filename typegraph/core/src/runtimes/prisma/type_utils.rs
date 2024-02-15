// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::borrow::Cow;

use crate::errors::Result;
use crate::types::{TypeDef, TypeDefExt};

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

impl<'a> TryFrom<&'a TypeDef> for RuntimeConfig<'a> {
    type Error = crate::wit::core::Error;

    fn try_from(type_def: &'a TypeDef) -> Result<Self> {
        Ok(Self::new(type_def.base().runtime_config.as_ref()))
    }
}
