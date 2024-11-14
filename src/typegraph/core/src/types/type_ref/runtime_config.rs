// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::{RefAttr, TypeRef};
use crate::errors::{Result, TgError};
use crate::types::Type;

pub trait WithRuntimeConfig {
    fn with_config(self, runtime_config: serde_json::Value) -> Result<TypeRef>;
}

impl<T> WithRuntimeConfig for T
where
    T: TryInto<Type, Error = TgError>,
{
    fn with_config(self, runtime_config: serde_json::Value) -> Result<TypeRef> {
        TypeRef::from_type(self.try_into()?, RefAttr::runtime("", runtime_config)).register()
    }
}
