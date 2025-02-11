// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod conv;
mod policies;
mod types;

use conv::ConversionKey;
use std::collections::HashMap;
pub use types::*;

#[cfg(feature = "mt")]
type Lrc<T> = std::sync::Arc<T>;
#[cfg(feature = "mt")]
type Weak<T> = std::sync::Weak<T>;
#[cfg(feature = "mt")]
type Lazy<T> = std::sync::OnceLock<T>;

#[cfg(not(feature = "mt"))]
type Lrc<T> = std::rc::Rc<T>;
#[cfg(not(feature = "mt"))]
type Weak<T> = std::rc::Weak<T>;
#[cfg(not(feature = "mt"))]
type Lazy<T> = std::cell::OnceCell<T>;

pub struct Typegraph {
    pub schema: Lrc<tg_schema::Typegraph>,
    pub root: Type,
    pub types: Vec<HashMap<ConversionKey, WeakType>>,
}

impl From<Lrc<tg_schema::Typegraph>> for Typegraph {
    fn from(schema: Lrc<tg_schema::Typegraph>) -> Self {
        conv::Conversion::convert(schema)
    }
}
