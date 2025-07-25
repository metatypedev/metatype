// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use tg_schema::{runtimes::prisma::PrismaRuntimeData, Typegraph};
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

#[deno_core::op2]
#[string]
pub fn op_typegraph_validate(#[string] input: &str) -> Result<String, OpErr> {
    let tg: Typegraph = serde_json::from_str(input).map_err(OpErr::map())?;
    serde_json::to_string(&tg).map_err(OpErr::map())
}

#[deno_core::op2(fast)]
pub fn op_validate_prisma_runtime_data(
    scope: &mut v8::HandleScope,
    inp: v8::Local<v8::Value>,
) -> Result<(), OpErr> {
    serde_v8::from_v8::<PrismaRuntimeData>(scope, inp).map_err(OpErr::map())?;
    Ok(())
}
