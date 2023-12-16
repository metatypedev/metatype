// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::Arc;

pub fn from_shared<T: Clone>(shared: Arc<T>) -> T {
    match Arc::try_unwrap(shared) {
        Ok(inner) => inner,
        Err(shared) => (*shared).clone(),
    }
}
