// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use indoc::formatdoc;
use regex::Regex;

use crate::{
    errors::Result,
    global_store::Store,
    runtimes::{deno::register_deno_func, DenoMaterializer, Materializer},
    types::{
        core::{ContextCheck, Policy, PolicyId},
        runtimes::{Effect, MaterializerDenoFunc, MaterializerDenoPredefined},
    },
};

pub fn register_policy(pol: Policy) -> Result<PolicyId> {
    Store::register_policy(pol.into())
}

pub fn get_public_policy() -> Result<(PolicyId, String)> {
    Ok({
        let policy_id = Store::get_public_policy_id();
        let policy = Store::get_policy(policy_id)?;
        (policy_id, policy.name.clone())
    })
}

pub fn get_internal_policy() -> Result<(PolicyId, String)> {
    let deno_mat = DenoMaterializer::Predefined(MaterializerDenoPredefined {
        name: "internal_policy".to_string(),
    });
    let mat = Materializer::deno(deno_mat, Effect::Read);
    let policy_id = Store::register_policy(
        Policy {
            materializer: Store::register_materializer(mat),
            name: "__internal".to_string(),
        }
        .into(),
    )?;
    Ok({
        let policy = Store::get_policy(policy_id)?;
        (policy_id, policy.name.clone())
    })
}

pub fn register_context_policy(key: String, check: ContextCheck) -> Result<(PolicyId, String)> {
    let name = match &check {
        ContextCheck::NotNull => format!("__ctx_{}", key),
        ContextCheck::Value(v) => format!("__ctx_{}_{}", key, v),
        ContextCheck::Pattern(p) => format!("__ctx_p_{}_{}", key, p),
    };
    let name = Regex::new("[^a-zA-Z0-9_]")
        .unwrap()
        .replace_all(&name, "_")
        .to_string();

    let check = match check {
        ContextCheck::NotNull => "value != null".to_string(),
        ContextCheck::Value(val) => {
            format!("value === {}", serde_json::to_string(&val).unwrap())
        }
        ContextCheck::Pattern(pattern) => {
            format!(
                "new RegExp({}).test(value)",
                serde_json::to_string(&pattern).unwrap()
            )
        }
    };

    let key = serde_json::to_string(&key).unwrap();

    let code = formatdoc! {r#"
            (_, {{ context }}) => {{
                const chunks = {key}.split(".");
                let value = context;
                for (const chunk of chunks) {{
                    value = value?.[chunk];
                }}
                return {check};
            }}
        "# };

    let mat_id = register_deno_func(
        MaterializerDenoFunc {
            code,
            secrets: vec![],
        },
        Effect::Read,
    )?;

    register_policy(Policy {
        name: name.clone(),
        materializer: mat_id,
    })
    .map(|id| (id, name))
}
