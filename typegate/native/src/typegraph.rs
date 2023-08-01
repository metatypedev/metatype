// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::Result;
use common::typegraph::{runtimes::prisma::PrismaRuntimeData, Typegraph};
use macros::{deno, deno_sync};

#[deno]
struct TypegraphValidateInp {
    json: String,
}

#[deno]
enum TypegraphValidateOut {
    Valid { json: String },
    NotValid { reason: String },
}

fn validate(json: String) -> Result<String> {
    let tg: Typegraph = serde_json::from_str(&json)?;
    Ok(serde_json::to_string(&tg)?)
}

#[deno]
fn typegraph_validate(input: TypegraphValidateInp) -> TypegraphValidateOut {
    match validate(input.json) {
        Ok(json) => TypegraphValidateOut::Valid { json },
        Err(e) => TypegraphValidateOut::NotValid {
            reason: format!("{e:?}"),
        },
    }
}

#[deno]
struct ValidateInput {
    obj: serde_json::Value,
}

#[deno]
struct ValidateResult {
    error: Option<String>,
}

#[deno_sync]
fn validate_prisma_runtime_data(inp: ValidateInput) -> ValidateResult {
    ValidateResult {
        error: serde_json::from_value::<PrismaRuntimeData>(inp.obj)
            .err()
            .map(|e| format!("{e:?}")),
    }
}
