// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::utils::normalize_type_title;
use crate::interlude::*;
use crate::shared::*;
use crate::utils::*;
use std::fmt::Write;

pub struct GenStubOptions {}

pub fn gen_stub(
    fun: &StubbedFunction,
    mod_stub_traits: &mut GenDestBuf,
    type_names: &BTreeMap<u32, Rc<str>>,
    _opts: &GenStubOptions,
) -> anyhow::Result<String> {
    let TypeNode::Function { base, data } = &fun.node else {
        unreachable!()
    };
    let inp_ty = type_names
        .get(&data.input)
        .context("input type for function not found")?;
    let out_ty = type_names
        .get(&data.output)
        .context("output type for function not found")?;
    let trait_name: String = normalize_type_title(&base.title);
    let title = &base.title;
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
    use super::*;
    use crate::{fdk_rust::*, tests::default_type_node_base};
    use common::typegraph::*;

    #[test]
    fn stub_test() -> anyhow::Result<()> {
        let tg_name = "my_tg".to_string();
        let tg = Box::new(Typegraph {
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
                data: serde_json::from_value(serde_json::json!({ "op_name": "my_op" })).unwrap(),
                effect: Effect {
                    effect: None,
                    idempotent: false,
                },
            }],
            types: vec![
                TypeNode::Object {
                    data: ObjectTypeData {
                        properties: Default::default(),
                        policies: Default::default(),
                        id: vec![],
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
        });
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
                            entries: fdk_rust::DEFAULT_TEMPLATE
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
pub mod types {
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

        fn handle(&self, input: MyInt, cx: Ctx) -> anyhow::Result<MyInt>;
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
