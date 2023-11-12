// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
use common::typegraph::{runtimes::prisma::PrismaRuntimeData, Typegraph};
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

#[deno_core::op2]
#[string]
pub fn op_typegraph_validate(#[string] input: &str) -> Result<String> {
    let tg: Typegraph = serde_json::from_str(input)?;
    Ok(serde_json::to_string(&tg)?)
}

#[deno_core::op2]
pub fn op_validate_prisma_runtime_data(
    scope: &mut v8::HandleScope,
    inp: v8::Local<v8::Value>,
) -> Result<()> {
    serde_v8::from_v8::<PrismaRuntimeData>(scope, inp)?;
    Ok(())
}
