// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use typegraph::FunctionType;
use typegraph::TypeNodeExt as _;

use super::utils::normalize_type_title;
use crate::interlude::*;
use crate::utils::*;
use std::fmt::Write;

pub struct GenStubOptions {}

pub fn gen_stub(
    fun: &Arc<FunctionType>,
    mod_stub_traits: &mut GenDestBuf,
    maps: &super::Maps,
    _opts: &GenStubOptions,
) -> anyhow::Result<String> {
    let inp_ty = maps
        .inputs
        .get(&fun.input().key())
        .map(|s| s.as_str())
        .unwrap_or("()");
    let out_ty = maps.outputs.get(&fun.output().key()).unwrap();
    let title = &fun.name();
    let trait_name: String = normalize_type_title(title);
    // FIXME: use hash or other stable id
    let id = title;
    writeln!(
        &mut mod_stub_traits.buf,
        r#"pub trait {trait_name}: Sized + 'static {{
    fn erased(self) -> ErasedHandler {{
        ErasedHandler {{
            mat_id: "{id}".into(),
            mat_title: "{title}".into(),
            mat_trait: "{trait_name}".into(),
            handler_fn: Box::new(move |req, cx| {{
                let req = serde_json::from_str(req)
                    .map_err(|err| HandleErr::InJsonErr(format!("{{err}}")))?;
                let res = self
                    .handle(req, cx)
                    .map_err(|err| HandleErr::HandlerErr(format!("{{err}}")))?;
                serde_json::to_string(&res)
                    .map_err(|err| HandleErr::HandlerErr(format!("{{err}}")))
            }}),
        }}
    }}

    fn handle(&self, input: {inp_ty}, cx: Ctx) -> anyhow::Result<{out_ty}>;
}}"#
    )?;
    Ok(trait_name)
}

pub fn gen_op_to_mat_map(
    op_to_trait_map: &BTreeMap<String, String>,
    dest: &mut GenDestBuf,
    _opts: &GenStubOptions,
) -> anyhow::Result<()> {
    writeln!(
        &mut dest.buf,
        r#"pub fn op_to_trait_name(op_name: &str) -> &'static str {{
    match op_name {{"#
    )?;
    let mut traits = op_to_trait_map.iter().collect::<Vec<(&String, &String)>>();
    traits.sort_by_key(|(key, _)| *key);
    for (op_name, trait_name) in traits {
        writeln!(&mut dest.buf, r#"        "{op_name}" => "{trait_name}","#,)?;
    }
    writeln!(
        &mut dest.buf,
        r#"        _ => panic!("unrecognized op_name: {{op_name}}"),
    }}
}}"#
    )?;
    Ok(())
}

#[cfg(test)]
mod test {
    use tests::default_type_node_base;

    use super::*;
    use crate::fdk_rs::*;

    #[test]
    fn stub_test() -> anyhow::Result<()> {
        let tg_name = "my_tg".to_string();
        let tg = {
            use tg_schema::*;

            Arc::new(Typegraph {
                path: None,
                policies: vec![],
                deps: vec![],
                meta: TypeMeta {
                    ..Default::default()
                },
                runtimes: vec![runtimes::TGRuntime::Unknown(runtimes::UnknownRuntime {
                    name: "wasm".into(),
                    data: Default::default(),
                })],
                materializers: vec![Materializer {
                    name: "function".into(),
                    runtime: 0,
                    data: serde_json::from_value(serde_json::json!({ "op_name": "my_op" }))
                        .unwrap(),
                    effect: tg_schema::Effect {
                        effect: None,
                        idempotent: false,
                    },
                }],
                types: vec![
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: {
                                let mut props = IndexMap::new();
                                props.insert("first".to_string(), 3_u32);
                                props
                            },
                            policies: Default::default(),
                            id: vec![],
                            required: vec![],
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "stub_test".into(),
                            ..default_type_node_base()
                        },
                    },
                    TypeNode::Object {
                        data: ObjectTypeData {
                            properties: Default::default(),
                            policies: Default::default(),
                            id: vec![],
                            required: vec![],
                            additional_props: false,
                        },
                        base: TypeNodeBase {
                            title: "my_inp".into(),
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
                            output: 2,
                            injections: Default::default(),
                            outjections: Default::default(),
                            runtime_config: Default::default(),
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
            })
        };

        let generator = Generator::new(FdkRustGenConfig {
            base: crate::config::FdkGeneratorConfigBase {
                path: "/".into(),
                typegraph_name: Some(tg_name.clone()),
                typegraph_path: None,
                template_dir: None,
            },
            stubbed_runtimes: Some(vec!["wasm".into()]),
            crate_name: None,
            skip_lib_rs: None,
            skip_cargo_toml: None,
            exclude_client: Some(true),
        })?;
        let out = generator.generate(
            [
                (
                    Generator::INPUT_TG.to_owned(),
                    GeneratorInputResolved::TypegraphFromTypegate { raw: tg },
                ),
                (
                    "template_dir".to_owned(),
                    GeneratorInputResolved::FdkTemplate {
                        template: FdkTemplate {
                            entries: fdk_rs::DEFAULT_TEMPLATE
                                .iter()
                                .map(|(file, content)| (*file, (*content).into()))
                                .collect(),
                        },
                    },
                ),
            ]
            .into_iter()
            .collect(),
        )?;
        let (_, buf) = out
            .0
            .iter()
            .find(|(path, _)| path.file_name().unwrap() == "fdk.rs")
            .unwrap();
        pretty_assertions::assert_eq!(
            r#"// gen-static-end
use types::*;
#[allow(unused)]
pub mod types {
    // input types
    #[derive(Debug, serde::Serialize, serde::Deserialize)]
    pub struct MyInp {
    }
    // partial output types
    // output types
    pub type MyInt = i64;
}
pub mod stubs {
    use super::*;
    pub trait MyFunc: Sized + 'static {
        fn erased(self) -> ErasedHandler {
            ErasedHandler {
                mat_id: "my_func".into(),
                mat_title: "my_func".into(),
                mat_trait: "MyFunc".into(),
                handler_fn: Box::new(move |req, cx| {
                    let req = serde_json::from_str(req)
                        .map_err(|err| HandleErr::InJsonErr(format!("{err}")))?;
                    let res = self
                        .handle(req, cx)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))?;
                    serde_json::to_string(&res)
                        .map_err(|err| HandleErr::HandlerErr(format!("{err}")))
                }),
            }
        }

        fn handle(&self, input: MyInp, cx: Ctx) -> anyhow::Result<MyInt>;
    }
    pub fn op_to_trait_name(op_name: &str) -> &'static str {
        match op_name {
            "my_op" => "MyFunc",
            _ => panic!("unrecognized op_name: {op_name}"),
        }
    }
}
"#,
            &buf.contents[buf.contents.find("// gen-static-end").unwrap()..]
        );
        Ok(())
    }
}
