// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

#[deno_core::op2]
#[string]
pub fn op_typescript_format_code(#[string] input: &str) -> Result<String> {
    match typescript::format_text(Path::new("code.ts"), input) {
        Ok(formatted_code) => Ok(formatted_code),
        Err(e) => {
            error!("{e:?}");
            Err(e)?
        }
    }
}
