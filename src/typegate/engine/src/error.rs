// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

#[derive(Debug)]
pub struct OpErr(pub anyhow::Error);
impl From<anyhow::Error> for OpErr {
    fn from(err: anyhow::Error) -> Self {
        Self(err)
    }
}
impl OpErr {
    pub fn get_error_class(_: &anyhow::Error) -> impl Into<std::borrow::Cow<'static, str>> {
        "Error"
    }
    pub fn map<T: Into<anyhow::Error>>() -> fn(T) -> Self {
        |err| OpErr(anyhow::anyhow!(err))
    }
}
impl std::error::Error for OpErr {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.0.source()
    }
}
impl std::fmt::Display for OpErr {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.0, f)
    }
}
impl deno_error::JsErrorClass for OpErr {
    fn get_class(&self) -> std::borrow::Cow<'static, str> {
        Self::get_error_class(&self.0).into()
    }
    fn get_message(&self) -> std::borrow::Cow<'static, str> {
        self.to_string().into()
    }
    fn get_additional_properties(
        &self,
    ) -> Vec<(
        std::borrow::Cow<'static, str>,
        std::borrow::Cow<'static, str>,
    )> {
        vec![]
    }
    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
impl std::ops::Deref for OpErr {
    type Target = anyhow::Error;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
