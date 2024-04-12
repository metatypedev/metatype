// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::utils::normalize_type_title;
use crate::interlude::*;
use crate::mdk::*;
use crate::utils::*;
use std::fmt::Write;

pub struct GenStubOptions {}

pub fn gen_stub(
    fun: &StubbedFunction,
    dest: &mut GenDestBuf,
    type_names: &HashMap<u32, Arc<str>>,
    _opts: &GenStubOptions,
) -> anyhow::Result<Arc<str>> {
    let TypeNode::Function { base, data } = &fun.node else {
        unreachable!()
    };
    let inp_ty = type_names
        .get(&data.input)
        .context("input type for function not found")?;
    let out_ty = type_names
        .get(&data.output)
        .context("output type for function not found")?;
    let trait_name: Arc<str> = normalize_type_title(&base.title).into();
    let title = &base.title;
    // FIXME: use hash or other stable id
    let id = title;
    writeln!(
        &mut dest.buf,
        r#"pub trait {trait_name}: Sized + 'static {{
    fn mat_title() -> &'static str {{
        "{title}"
    }}

    fn mat_id() -> &'static str {{
        "{id}"
    }}

    fn erased(self) -> ErasedHandler {{
        ErasedHandler {{
            mat_id: Self::mat_id().into(),
            mat_title: Self::mat_title().into(),
            handler_fn: Box::new(move |req, cx| {{
                let req = serde_json::from_str(req).unwrap();
                let res = self.handle(req, cx);
                match res {{
                    Ok(out) => Ok(serde_json::to_string(&out).unwrap()),
                    Err(err) => Err(format!("{{err}}")),
                }}
            }}),
        }}
    }}

    fn handle(input: {inp_ty}, cx: Ctx) -> anyhow::Result<{out_ty}>;
}}"#
    )?;
    Ok(trait_name)
}

pub fn gen_op_to_mat_map(
    op_to_mat_map: &HashMap<String, u32>,
    dest: &mut GenDestBuf,
    type_names: &HashMap<u32, Arc<str>>,
    _opts: &GenStubOptions,
) -> anyhow::Result<()> {
    writeln!(
        &mut dest.buf,
        r#"fn op_to_trait_name(op_name: &str) -> &'static str {{
    match op_name {{"#
    )?;
    for (op_name, mat_id) in op_to_mat_map {
        let trait_name = type_names
            .get(mat_id)
            .context("materializer specified by operation not found in generated set")?;
        writeln!(&mut dest.buf, r#"        "{op_name}" => "{trait_name}""#,)?;
    }
    // "my_faas" => "MyFaas",
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
    use crate::{mdk_rust::*, tests::default_type_node_base};
    use common::typegraph::*;

    #[test]
    fn stub_test() -> anyhow::Result<()> {
        let tg_name = "my_tg".to_string();
        let tg = Typegraph {
            id: "https://metatype.dev/specs/0.0.3.json".into(),
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
        };
        let generator = Generator::new(MdkRustGenConfig {
            base: crate::config::MdkGeneratorConfigBase {
                path: "/".into(),
                typegraph_name: Some(tg_name.clone()),
                typegraph_path: None,
            },
            stubbed_runtimes: Some(vec!["wasm".into()]),
            crate_name: None,
        })?;
        let out = generator.generate(
            [(
                Generator::INPUT_TG.to_owned(),
                GeneratorInputResolved::TypegraphFromTypegate { raw: tg },
            )]
            .into_iter()
            .collect(),
        )?;
        let (_, buf) = out
            .0
            .iter()
            .find(|(path, _)| path.file_name().unwrap() == "gen.rs")
            .unwrap();
        assert_eq!(
            r#"// gen-static-end
pub type MyInt = i64;
pub trait MyFunc: Sized + 'static {
    fn mat_title() -> &'static str {
        "my_func"
    }

    fn mat_id() -> &'static str {
        "my_func"
    }

    fn erased(self) -> ErasedHandler {
        ErasedHandler {
            mat_id: Self::mat_id().into(),
            mat_title: Self::mat_title().into(),
            handler_fn: Box::new(move |req, cx| {
                let req = serde_json::from_str(req).unwrap();
                let res = self.handle(req, cx);
                match res {
                    Ok(out) => Ok(serde_json::to_string(&out).unwrap()),
                    Err(err) => Err(format!("{err}")),
                }
            }),
        }
    }

    fn handle(input: MyInt, cx: Ctx) -> anyhow::Result<MyInt>;
}
fn op_to_trait_name(op_name: &str) -> &'static str {
    match op_name {
        _ => panic!("unrecognized op_name: {op_name}"),
    }
}
"#,
            &buf.contents[buf.contents.find("// gen-static-end").unwrap()..]
        );
        Ok(())
    }
}
