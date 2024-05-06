// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use common::typegraph::*;

pub async fn test_typegraph_1() -> anyhow::Result<Typegraph> {
    let out = tokio::process::Command::new("cargo")
        .args(
            "run -p meta-cli -- serialize -f tests/tg.ts"
                // "run -p meta-cli -- serialize -f ../../examples/typegraphs/reduce.py"
                .split(' ')
                .collect::<Vec<_>>(),
        )
        .kill_on_drop(true)
        .output()
        .await?;
    let mut tg: Vec<Typegraph> = serde_json::from_slice(&out.stdout)
        .with_context(|| format!("error deserializing typegraph: {out:?}"))?;
    Ok(tg.pop().unwrap())
}

#[allow(unused)]
pub fn test_typegraph_2() -> Typegraph {
    Typegraph {
        path: None,
        policies: vec![],
        deps: vec![],
        meta: TypeMeta {
            ..Default::default()
        },
        runtimes: vec![common::typegraph::runtimes::TGRuntime::Unknown(
            common::typegraph::runtimes::UnknownRuntime {
                name: "wasm".into(),
                data: Default::default(),
            },
        )],
        materializers: vec![Materializer {
            name: "function".into(),
            runtime: 0,
            data: Default::default(),
            effect: Effect {
                effect: None,
                idempotent: false,
            },
        }],
        types: vec![
            TypeNode::Object {
                data: ObjectTypeData {
                    properties: Default::default(),
                    required: vec![],
                },
                base: TypeNodeBase {
                    ..default_type_node_base()
                },
            },
            TypeNode::Integer {
                data: IntegerTypeData {
                    maximum: None,
                    multiple_of: None,
                    exclusive_minimum: None,
                    exclusive_maximum: None,
                    minimum: None,
                },
                base: TypeNodeBase {
                    title: "my_int".into(),
                    ..default_type_node_base()
                },
            },
            TypeNode::Function {
                data: FunctionTypeData {
                    input: 1,
                    output: 1,
                    rate_calls: false,
                    rate_weight: None,
                    materializer: 0,
                    parameter_transform: None,
                },
                base: TypeNodeBase {
                    title: "my_func".into(),
                    ..default_type_node_base()
                },
            },
        ],
    }
}

pub fn default_type_node_base() -> TypeNodeBase {
    TypeNodeBase {
        title: String::new(),
        as_id: false,
        config: Default::default(),
        runtime: 0,
        policies: vec![],
        injection: None,
        description: None,
        enumeration: None,
    }
}
