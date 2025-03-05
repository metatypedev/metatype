// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod args;
mod common;
#[cfg(feature = "graphql")]
pub mod files;
#[cfg(feature = "graphql")]
pub mod graphql;
pub mod hostcall;
pub mod nodes;
pub mod selection;

mod interlude {
    pub use serde::{Deserialize, Serialize};
    pub use std::collections::HashMap;
    pub use std::marker::PhantomData;

    pub type CowStr = std::borrow::Cow<'static, str>;
    pub type BoxErr = Box<dyn std::error::Error + Send + Sync>;
    pub type JsonObject = serde_json::Map<String, serde_json::Value>;

    pub fn to_json_value<T: Serialize>(val: T) -> serde_json::Value {
        serde_json::to_value(val).expect("error serializing value")
    }
}

pub mod prelude {
    pub use crate::args::*;
    pub use crate::common::*;
    #[cfg(feature = "graphql")]
    pub use crate::files::*;
    #[cfg(feature = "graphql")]
    pub use crate::graphql::*;
    pub use crate::interlude::BoxErr;
    pub use crate::nodes::*;
    pub use crate::selection::*;
    pub use crate::{impl_selection_traits, impl_union_selection_traits};
    #[cfg(feature = "graphql")]
    pub use reqwest::Url;
}
