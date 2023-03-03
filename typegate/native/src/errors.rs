// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CustomErrors {
    #[error("deno error: {message}")]
    _Demo { message: String },
}
