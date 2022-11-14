// Copyright Metatype under the Elastic License 2.0.

use anyhow::Result;
use common::typegraph::Typegraph;
use deno_bindgen::deno_bindgen;

#[deno_bindgen]
struct TypegraphValidateInp {
    json: String,
}

#[deno_bindgen]
enum TypegraphValidateOut {
    Valid { json: String },
    NotValid { reason: String },
}

fn validate(json: String) -> Result<String> {
    let tg: Typegraph = serde_json::from_str(&json)?;
    Ok(serde_json::to_string(&tg)?)
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn typegraph_validate(input: TypegraphValidateInp) -> TypegraphValidateOut {
    match validate(input.json) {
        Ok(json) => TypegraphValidateOut::Valid { json },
        Err(e) => TypegraphValidateOut::NotValid {
            reason: format!("{e:?}"),
        },
    }
}
