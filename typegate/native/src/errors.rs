// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CustomErrors {
    #[error("deno error: {message}")]
    _Demo { message: String },
}
