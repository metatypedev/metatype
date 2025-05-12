// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

pub fn create_typegraph(
    tg_name: String,
    test_types: Vec<tg_schema::TypeNode>,
) -> Result<Arc<tg_schema::Typegraph>> {
    let types = {
        use tg_schema::*;
        let mut types = vec![
            TypeNode::Object {
                base: TypeNodeBase {
                    title: format!("tg_{}", tg_name),
                    ..default_type_node_base()
                },
                data: ObjectTypeData {
                    properties: [("root".to_string(), 1)].into_iter().collect(),
                    policies: Default::default(),
                    id: vec![],
                    required: vec![],
                    additional_props: false,
                },
            },
            TypeNode::Function {
                data: FunctionTypeData {
                    input: 2,
                    output: 3,
                    parameter_transform: None,
                    materializer: 0,
                    injections: Default::default(),
                    outjections: Default::default(),
                    rate_calls: Default::default(),
                    rate_weight: Default::default(),
                    runtime_config: Default::default(),
                },
                base: TypeNodeBase {
                    title: "MyFunction".into(),
                    ..default_type_node_base()
                },
            },
            TypeNode::Object {
                base: TypeNodeBase {
                    title: "MyInput".into(),
                    ..default_type_node_base()
                },
                data: ObjectTypeData {
                    properties: [].into_iter().collect(),
                    policies: Default::default(),
                    id: vec![],
                    required: vec![],
                    additional_props: false,
                },
            },
            TypeNode::Object {
                base: TypeNodeBase {
                    title: "MyOutput".into(),
                    ..default_type_node_base()
                },
                data: ObjectTypeData {
                    properties: test_types
                        .iter()
                        .enumerate()
                        .map(|(idx, ty)| (ty.base().title.clone(), idx as u32 + 4))
                        .collect(),
                    policies: Default::default(),
                    id: vec![],
                    required: vec![],
                    additional_props: false,
                },
            },
        ];

        types.extend(test_types);

        types
    };

    let schema = tg_schema::Typegraph {
        types,
        runtimes: vec![tg_schema::runtimes::TGRuntime::Known(
            tg_schema::runtimes::KnownRuntime::Deno(tg_schema::runtimes::deno::DenoRuntimeData {
                worker: "default".to_string(),
                permissions: Default::default(),
            }),
        )],
        materializers: vec![tg_schema::Materializer {
            name: "default".into(),
            runtime: 0,
            effect: tg_schema::Effect {
                effect: None,
                idempotent: true,
            },
            data: Default::default(),
        }],
        policies: Default::default(),
        meta: Default::default(),
        deps: Default::default(),
        path: None,
    };

    let tg = Arc::new(schema);

    Ok(tg)
}

pub async fn test_typegraph_1() -> anyhow::Result<Arc<tg_schema::Typegraph>> {
    let out = tokio::process::Command::new("cargo")
        .args(
            "run -p meta-cli -- serialize -f fixtures/tg.ts -vvv"
                .split(' ')
                .collect::<Vec<_>>(),
        )
        .env(
            "MCLI_LOADER_CMD",
            "deno run -A --config=../../examples/deno.jsonc {filepath}",
        )
        .kill_on_drop(true)
        .output()
        .await?;
    let mut tg: Vec<tg_schema::Typegraph> =
        serde_json::from_slice(&out.stdout).with_context(|| {
            format!(
                "error deserializing typegraph: {out:?}\nstderr):\n{}\n---END---",
                std::str::from_utf8(&out.stderr).unwrap(),
            )
        })?;

    let tg = Arc::new(tg.pop().unwrap());
    Ok(tg)
}

// #[allow(unused)]
// pub fn test_typegraph_2() -> Typegraph {
//     Typegraph {
//         path: None,
//         policies: vec![],
//         deps: vec![],
//         meta: TypeMeta {
//             ..Default::default()
//         },
//         runtimes: vec![tg_schema::runtimes::TGRuntime::Unknown(
//             tg_schema::runtimes::UnknownRuntime {
//                 name: "wasm".into(),
//                 data: Default::default(),
//             },
//         )],
//         materializers: vec![Materializer {
//             name: "function".into(),
//             runtime: 0,
//             data: Default::default(),
//             effect: Effect {
//                 effect: None,
//                 idempotent: false,
//             },
//         }],
//         types: vec![
//             TypeNode::Object {
//                 data: ObjectTypeData {
//                     properties: Default::default(),
//                     policies: Default::default(),
//                     id: vec![],
//                     required: vec![],
//                 },
//                 base: TypeNodeBase {
//                     ..default_type_node_base()
//                 },
//             },
//             TypeNode::Integer {
//                 data: IntegerTypeData {
//                     maximum: None,
//                     multiple_of: None,
//                     exclusive_minimum: None,
//                     exclusive_maximum: None,
//                     minimum: None,
//                 },
//                 base: TypeNodeBase {
//                     title: "my_int".into(),
//                     ..default_type_node_base()
//                 },
//             },
//             TypeNode::Function {
//                 data: FunctionTypeData {
//                     input: 1,
//                     output: 1,
//                     injections: Default::default(),
//                     outjections: Default::default(),
//                     runtime_config: Default::default(),
//                     rate_calls: false,
//                     rate_weight: None,
//                     materializer: 0,
//                     parameter_transform: None,
//                 },
//                 base: TypeNodeBase {
//                     title: "my_func".into(),
//                     ..default_type_node_base()
//                 },
//             },
//         ],
//     }
// }

pub fn default_type_node_base() -> tg_schema::TypeNodeBase {
    tg_schema::TypeNodeBase {
        title: String::new(),
        description: None,
        enumeration: None,
    }
}

pub async fn test_typegraph_3() -> anyhow::Result<Arc<tg_schema::Typegraph>> {
    let out = tokio::process::Command::new("cargo")
        .args(
            "run -p meta-cli -- serialize -f fixtures/tg2.ts -vvv"
                // "run -p meta-cli -- serialize -f ../../examples/typegraphs/reduce.py"
                .split(' ')
                .collect::<Vec<_>>(),
        )
        .env(
            "MCLI_LOADER_CMD",
            "deno run -A --config=../../examples/deno.jsonc {filepath}",
        )
        .kill_on_drop(true)
        .output()
        .await?;
    let mut tg: Vec<tg_schema::Typegraph> =
        serde_json::from_slice(&out.stdout).with_context(|| {
            format!(
                "error deserializing typegraph: {out:?}\nstderr):\n{}\n---END---",
                std::str::from_utf8(&out.stderr).unwrap(),
            )
        })?;

    let tg = Arc::new(tg.pop().unwrap());
    Ok(tg)
}
