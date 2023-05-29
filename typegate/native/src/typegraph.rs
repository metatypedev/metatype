// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::Result;
use common::typegraph::Typegraph;
use macros::deno;

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
