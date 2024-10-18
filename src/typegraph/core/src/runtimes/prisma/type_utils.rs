// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;

type JsonValue = serde_json::Value;

#[derive(Debug)]
pub struct RuntimeConfig<'a>(pub Vec<&'a JsonValue>);

impl<'a> RuntimeConfig<'a> {
    pub fn get<T>(&self, key: &str) -> Result<Option<T>>
    where
        T: serde::de::DeserializeOwned,
    {
        self.0
            .iter()
            .find_map(|&v| {
                v.get(key).map(|v| {
                    serde_json::from_value(v.clone())
                        .map_err(|e| format!("invalid config value for {}: {}", key, e).into())
                })
            })
            .transpose()
    }
}
