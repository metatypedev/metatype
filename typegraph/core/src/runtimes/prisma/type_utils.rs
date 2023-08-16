// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::global_store::{with_store, Store};
use crate::types::Type;
use crate::wit::core::TypeId;

pub fn is_unique_ref(id: TypeId) -> Result<bool> {
    with_store(|s| match s.get_type(id)? {
        Type::Proxy(p) => Ok(p
            .data
            .get_extra("unique")
            .map(|u| serde_json::from_str::<bool>(u))
            .transpose()
            .map_err(|e| "invalid 'unique' config: expected string".to_string())?
            .unwrap_or(false)),
        _ => Ok(false),
    })
}

pub fn has_fkey(id: TypeId) -> Result<Option<bool>> {
    with_store(|s| match s.get_type(id)? {
        Type::Proxy(p) => p
            .data
            .get_extra("fkey")
            .map(|v| serde_json::from_str(v))
            .transpose()
            .map_err(|e| "invalid 'fkey' field".to_string()),
        _ => Ok(None),
    })
}
