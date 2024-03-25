#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work
use typescript::parser::transform_script;

#[deno_core::op2]
#[string]
pub fn op_deno_transform_typescript(#[string] script: String) -> Result<String> {
    transform_script(script)
}
