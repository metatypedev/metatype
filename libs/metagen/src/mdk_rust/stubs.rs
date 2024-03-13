// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use super::utils::normalize_type_title;
use crate::interlude::*;
use crate::utils::*;
use crate::*;
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
    dest.buf.write_fmt(format_args!(
        r#"pub trait {trait_name} {{
    fn handle(input: {inp_ty}, cx: Ctx) -> anyhow::Result<{out_ty}>;
}}
"#
    ))?;
    Ok(trait_name)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::mdk_rust::*;
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
                path: "/tmp".into(),
                typegraph: tg_name.clone(),
            },
            stubbed_runtimes: Some(vec!["wasm".into()]),
        })?;
        let out = generator.generate(
            [(
                Generator::INPUT_TG.to_owned(),
                GeneratorInputResolved::TypegraphDesc { raw: tg },
            )]
            .into_iter()
            .collect(),
        )?;
        let (_, buf) = out.0.iter().next().unwrap();
        assert_eq!(
            &format!(
                r#"{stat}
pub type MyInt = i64;
pub triat MyFunc {{
    fn handle(input: MyInt, cx: Ctx) -> anyhow::Result<MyInt>;
}}
"#,
                stat = include_str!("static/lib.rs")
            ),
            buf
        );
        Ok(())
    }

    fn default_type_node_base() -> TypeNodeBase {
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
}
