// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod node_metas;
mod selections;

use core::fmt::Write;

use shared::get_gql_type;
use tg_schema::EffectType;

use crate::interlude::*;
use crate::*;

use crate::fdk_rs::utils;
use crate::shared::client::*;
use crate::shared::types::NameMemo;
use crate::shared::types::TypeRenderer;
use crate::utils::GenDestBuf;
use utils::normalize_type_title;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct ClienRsGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
    #[garde(length(min = 1))]
    crate_name: Option<String>,
    #[garde(skip)]
    pub skip_cargo_toml: Option<bool>,
    #[garde(skip)]
    pub skip_lib_rs: Option<bool>,
}

impl ClienRsGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: ClienRsGenConfig = serde_json::from_value(json)?;
        config.base.path = workspace_path.join(config.base.path);
        config.base.typegraph_path = config
            .base
            .typegraph_path
            .as_ref()
            .map(|path| workspace_path.join(path));
        Ok(config)
    }
}

pub struct Generator {
    config: ClienRsGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: ClienRsGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate()?;
        Ok(Self { config })
    }
}

impl crate::Plugin for Generator {
    fn bill_of_inputs(&self) -> IndexMap<String, GeneratorInputOrder> {
        [(
            Self::INPUT_TG.to_string(),
            if let Some(tg_name) = &self.config.base.typegraph_name {
                GeneratorInputOrder::TypegraphFromTypegate {
                    name: tg_name.clone(),
                }
            } else if let Some(tg_path) = &self.config.base.typegraph_path {
                GeneratorInputOrder::TypegraphFromPath {
                    path: tg_path.clone(),
                    name: self.config.base.typegraph_name.clone(),
                }
            } else {
                unreachable!()
            },
        )]
        .into_iter()
        .collect()
    }

    fn generate(
        &self,
        inputs: IndexMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput> {
        let tg = match inputs
            .get(Self::INPUT_TG)
            .context("missing generator input")?
        {
            GeneratorInputResolved::TypegraphFromTypegate { raw } => raw,
            GeneratorInputResolved::TypegraphFromPath { raw } => raw,
            _ => bail!("unexpected input type"),
        };
        let mut out = IndexMap::new();
        out.insert(
            self.config.base.path.join("client.rs"),
            GeneratedFile {
                contents: render_client_rs(&self.config, tg)?,
                overwrite: true,
            },
        );
        let crate_name = self.config.crate_name.clone().unwrap_or_else(|| {
            use heck::ToSnekCase;
            let tg_name = tg.name().unwrap_or_else(|_| "generated".to_string());
            format!("{}_fdk", tg_name.to_snek_case())
        });
        if !matches!(self.config.skip_cargo_toml, Some(true)) {
            out.insert(
                self.config.base.path.join("Cargo.toml"),
                GeneratedFile {
                    contents: gen_cargo_toml(Some(&crate_name)),
                    overwrite: false,
                },
            );
        }
        if !matches!(self.config.skip_lib_rs, Some(true)) {
            out.insert(
                self.config.base.path.join("lib.rs"),
                GeneratedFile {
                    contents: gen_lib_rs(),
                    overwrite: false,
                },
            );
        }

        Ok(GeneratorOutput(out))
    }
}

fn render_client_rs(_config: &ClienRsGenConfig, tg: &Typegraph) -> anyhow::Result<String> {
    let mut client_rs = GenDestBuf {
        buf: Default::default(),
    };

    writeln!(
        &mut client_rs,
        "// This file was @generated by metagen and is intended"
    )?;
    writeln!(
        &mut client_rs,
        "// to be generated again on subsequent metagen runs."
    )?;
    writeln!(&mut client_rs)?;

    render_client(&mut client_rs, tg, &GenClientRsOpts { hostcall: false })?;

    writeln!(&mut client_rs)?;
    Ok(client_rs.buf)
}

pub struct GenClientRsOpts {
    pub hostcall: bool,
}

pub fn render_client(
    dest: &mut GenDestBuf,
    tg: &Typegraph,
    opts: &GenClientRsOpts,
) -> anyhow::Result<NameMemo> {
    render_static(dest, opts.hostcall)?;

    let manifest = get_manifest(tg)?;

    let name_mapper = NameMapper {
        nodes: tg.types.iter().cloned().map(Rc::new).collect(),
        memo: Default::default(),
    };
    let name_mapper = Rc::new(name_mapper);

    let (node_metas, named_types) = render_node_metas(dest, &manifest, name_mapper.clone())?;
    let (data_types, return_types) = render_data_types(dest, tg, &manifest, name_mapper.clone())?;
    let data_types = Rc::new(data_types);
    let selection_names =
        render_selection_types(dest, &manifest, data_types.clone(), name_mapper.clone())?;

    write!(
        dest,
        r#"
pub fn query_graph() -> QueryGraph {{
    QueryGraph {{
        ty_to_gql_ty_map: std::sync::Arc::new([
        "#
    )?;
    for (&id, ty_name) in name_mapper.memo.borrow().deref() {
        let gql_ty = get_gql_type(&tg.types, id, false);
        write!(
            dest,
            r#"
            ("{ty_name}".into(), "{gql_ty}".into()),"#
        )?;
    }
    for id in named_types {
        let ty_name = &tg.types[id as usize].base().title;
        let gql_ty = get_gql_type(&tg.types, id, false);
        write!(
            dest,
            r#"
            ("{ty_name}".into(), "{gql_ty}".into()),"#
        )?;
    }
    write!(
        dest,
        r#"
        ].into()),
    }}
}}
"#
    )?;

    writeln!(dest, r#"impl QueryGraph {{"#)?;
    for fun in manifest.root_fns {
        use heck::ToSnekCase;

        let node_name = fun.name;
        let method_name = node_name.to_snek_case();
        let out_ty_name = return_types.get(&fun.out_id).unwrap();
        let out_ty_name = if shared::is_composite(&tg.types, fun.out_id) {
            format!("return_types::{out_ty_name}",)
        } else {
            out_ty_name.to_string()
        };

        let arg_ty = fun.in_id.map(|id| data_types.get(&id).unwrap());
        let select_ty = fun.select_ty.map(|id| selection_names.get(&id).unwrap());

        let (marker_ty, node_ty) = match fun.effect {
            EffectType::Read => ("QueryMarker", "QueryNode"),
            EffectType::Update | EffectType::Delete | EffectType::Create => {
                ("MutationMarker", "MutationNode")
            }
        };

        let meta_method = node_metas
            .get(&fun.id)
            .map(|str| &str[..])
            .unwrap_or_else(|| "scalar");

        let args_row = match &arg_ty {
            Some(arg_ty) => format!(
                "
        args: impl Into<NodeArgs<{arg_ty}>>"
            ),
            None => "".into(),
        };
        match &select_ty {
            Some(select_ty) => {
                let arg_value = match &arg_ty {
                    Some(_) => "args.into().into()",
                    None => "NodeArgsErased::None",
                };
                write!(
                    dest,
                    r#"
    pub fn {method_name}(
        &self,{args_row}
    ) -> UnselectedNode<{select_ty}, {select_ty}<HasAlias>, {marker_ty}, {out_ty_name}>
    {{
        UnselectedNode {{
            root_name: "{node_name}".into(),
            root_meta: node_metas::{meta_method},
            args: {arg_value},
            _marker: PhantomData,
        }}
    }}"#
                )?;
            }
            None => {
                let arg_value = match &arg_ty {
                    Some(_) => "SelectionErased::ScalarArgs(args.into().into())",
                    None => "SelectionErased::Scalar",
                };
                write!(
                    dest,
                    r#"
    pub fn {method_name}(
        &self,{args_row}
    ) -> {node_ty}<{out_ty_name}>
    {{
        let nodes = selection_to_node_set(
            SelectionErasedMap(
                [(
                    "{node_name}".into(),
                    {arg_value},
                )]
                .into(),
            ),
            &[
                ("{node_name}".into(), node_metas::{meta_method} as NodeMetaFn),
            ].into(),
            "$q".into(),
        )
        .unwrap();
        {node_ty}(nodes.into_iter().next().unwrap(), PhantomData)
    }}"#
                )?;
            }
        };
    }
    writeln!(
        dest,
        "
}}"
    )?;
    Ok(Rc::into_inner(data_types).unwrap())
}

/// Render the common sections like the transports
fn render_static(dest: &mut GenDestBuf, hostcall: bool) -> anyhow::Result<()> {
    let client_rs = include_str!("static/client.rs");
    crate::utils::processed_write(
        dest,
        client_rs,
        &[("HOSTCALL".to_string(), hostcall)].into_iter().collect(),
    )?;
    Ok(())
}

/// Render the types that'll actually hold the data, the ones
/// used for serialization
fn render_data_types(
    dest: &mut GenDestBuf,
    tg: &Typegraph,
    manifest: &RenderManifest,
    name_mapper: Rc<NameMapper>,
) -> anyhow::Result<(NameMemo, NameMemo)> {
    // we first render all types under the `types`
    // module for general use
    let name_memo = {
        let mut renderer = TypeRenderer::new(
            name_mapper.nodes.clone(),
            Rc::new(fdk_rs::types::RustTypeRenderer {
                derive_debug: true,
                derive_serde: true,
                all_fields_optional: false,
            }),
            [],
        );
        for id in 1..tg.types.len() {
            _ = renderer.render(id as u32)?;
        }
        let (types_rs, name_memo) = renderer.finalize();
        writeln!(dest.buf, "use types::*;")?;
        writeln!(dest.buf, "#[allow(unused)]")?;
        writeln!(dest.buf, "pub mod types {{")?;
        for line in types_rs.lines() {
            writeln!(dest.buf, "    {line}")?;
        }
        writeln!(dest.buf, "}}")?;
        name_memo
    };
    // for types used for fn return types
    // we separately render types that are
    // fully partial
    let name_memo_partial = {
        let mut renderer = TypeRenderer::new(
            name_mapper.nodes.clone(),
            Rc::new(fdk_rs::types::RustTypeRenderer {
                derive_debug: true,
                derive_serde: true,
                all_fields_optional: true,
            }),
            // we pre seed the renderer with names for those that
            // aren't composites
            name_memo.iter().filter_map(|(&ii, name)| {
                if tg.types[ii as usize].type_name() == "function" {
                    return None;
                }
                if !shared::is_composite(&tg.types, ii) {
                    Some((ii, name.clone()))
                } else {
                    None
                }
            }),
        );
        for &id in &manifest.return_types {
            _ = renderer.render(id)?;
        }
        let (types_rs, name_memo) = renderer.finalize();
        // writeln!(dest.buf, "use return_types::*;")?;
        writeln!(dest.buf, "#[allow(unused)]")?;
        writeln!(dest.buf, "pub mod return_types {{")?;
        writeln!(dest.buf, "    use super::types::*;")?;
        for line in types_rs.lines() {
            writeln!(dest.buf, "    {line}")?;
        }
        writeln!(dest.buf, "}}")?;
        name_memo
    };
    Ok((name_memo, name_memo_partial))
}

/// Render the type used for selecting fields
fn render_selection_types(
    dest: &mut GenDestBuf,
    manifest: &RenderManifest,
    arg_types_memo: Rc<NameMemo>,
    name_mapper: Rc<NameMapper>,
) -> Result<NameMemo> {
    let mut renderer = TypeRenderer::new(
        name_mapper.nodes.clone(),
        Rc::new(selections::RsNodeSelectionsRenderer {
            arg_ty_names: arg_types_memo,
        }),
        [],
    );
    for &id in &manifest.selections {
        _ = renderer.render(id)?;
    }
    let (buf, memo) = renderer.finalize();
    write!(dest, "{buf}")?;
    Ok(memo)
}

/// Render the `nodeMetas` object used to encode the query
/// graph metadata
fn render_node_metas(
    dest: &mut GenDestBuf,
    manifest: &RenderManifest,
    name_mapper: Rc<NameMapper>,
) -> Result<(NameMemo, IndexSet<u32>)> {
    let named_types = Rc::new(std::sync::Mutex::new(IndexSet::new()));
    let mut renderer = TypeRenderer::new(
        name_mapper.nodes.clone(),
        Rc::new(node_metas::RsNodeMetasRenderer {
            name_mapper,
            named_types: named_types.clone(),
            input_files: manifest.input_files.clone(),
        }),
        [],
    );
    for &id in &manifest.node_metas {
        _ = renderer.render(id)?;
    }
    let (methods, memo) = renderer.finalize();
    write!(
        dest,
        r#"
#[allow(non_snake_case)]
mod node_metas {{
    use super::*;
    pub fn scalar() -> NodeMeta {{
        NodeMeta {{
            arg_types: None,
            sub_nodes: None,
            variants: None,
            input_files: None,
        }}
    }}"#
    )?;
    for line in methods.lines() {
        writeln!(dest, "    {line}")?;
    }
    write!(
        dest,
        r#"
}}
"#
    )?;
    Ok((
        memo,
        Rc::try_unwrap(named_types).unwrap().into_inner().unwrap(),
    ))
}

struct NameMapper {
    nodes: Vec<Rc<TypeNode>>,
    memo: std::cell::RefCell<NameMemo>,
}

impl NameMapper {
    pub fn name_for(&self, id: u32) -> Rc<str> {
        self.memo
            .borrow_mut()
            .entry(id)
            .or_insert_with(|| {
                Rc::from(normalize_type_title(&self.nodes[id as usize].base().title))
            })
            .clone()
    }
}

pub fn gen_cargo_toml(crate_name: Option<&str>) -> String {
    let crate_name = crate_name.unwrap_or("client_rs_static");

    #[cfg(debug_assertions)]
    let is_test = std::env::var("METAGEN_CLIENT_RS_TEST").ok().as_deref() == Some("1");

    #[cfg(debug_assertions)]
    let dependency = {
        use normpath::PathExt;
        let client_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../metagen-client-rs")
            .normalize()
            .unwrap();
        format!(
            r#"metagen-client = {{ path = "{client_path}" }}"#,
            client_path = client_path.as_path().to_str().unwrap()
        )
    };

    #[cfg(not(debug_assertions))]
    let dependency = format!(
        "metagen-client = {{ git = \"https://github.com/metatypedev/metatype.git\", tag = \"{version}\" }}",
        version = env!("CARGO_PKG_VERSION")
    );

    #[cfg(debug_assertions)]
    let additional_deps = if is_test {
        r#"
tokio = { version = "1.0", features = ["rt-multi-thread"] }
    "#
    } else {
        ""
    };

    #[cfg(not(debug_assertions))]
    let additional_deps = "";

    let bin_path = std::env::var("METAGEN_BIN_PATH").ok();

    let exec = if let Some(bin_path) = bin_path {
        format!(
            r#"
[[bin]]
name = "metagen"
path = "{bin_path}"
"#
        )
    } else {
        r#"
# The options after here are configured for crates intended to be
# wasm artifacts. Remove them if your usage is different
[lib]
path = "lib.rs"
crate-type = ["cdylib", "rlib"]
        "#
        .to_string()
    };
    format!(
        r#"[package]
name = "{crate_name}"
edition = "2021"
version = "0.0.1"

[dependencies]
{dependency}
serde = {{ version = "1.0", features = ["derive"] }}
serde_json = "1.0"
{additional_deps}

{exec}
"#
    )
}

pub fn gen_lib_rs() -> String {
    r#"
mod client;
pub use client::*;

"#
    .into()
}

#[test]
fn e2e() -> anyhow::Result<()> {
    use crate::tests::*;

    let tg_name = "gen-test";
    let config = config::Config {
        targets: [(
            "default".to_string(),
            config::Target(
                [GeneratorConfig {
                    generator_name: "client_rs".to_string(),
                    other: serde_json::to_value(client_rs::ClienRsGenConfig {
                        skip_cargo_toml: None,
                        skip_lib_rs: Some(true),
                        crate_name: None,
                        base: config::FdkGeneratorConfigBase {
                            typegraph_name: Some(tg_name.into()),
                            typegraph_path: None,
                            // NOTE: root will map to the test's tempdir
                            path: "./".into(),
                            template_dir: None,
                        },
                    })?,
                }]
                .into_iter()
                .collect(),
            ),
        )]
        .into_iter()
        .collect(),
    };
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_stack_size(16 * 1024 * 1024)
        .build()?
        .block_on(async {
            let tg = test_typegraph_3().await?;
            e2e_test(vec![E2eTestCase {
                typegraphs: [(tg_name.to_string(), tg)].into_iter().collect(),
                target: "default".into(),
                config,
                build_fn: |args| {
                    Box::pin(async move {
                        let status = tokio::process::Command::new("cargo")
                            .args("clippy".split(' ').collect::<Vec<_>>())
                            .current_dir(args.path)
                            .kill_on_drop(true)
                            .spawn()?
                            .wait()
                            .await?;
                        if !status.success() {
                            anyhow::bail!("error building generated crate");
                        }
                        Ok(())
                    })
                },
                target_dir: Some("./fixtures/client_rs/".into()),
            }])
            .await
        })?;
    Ok(())
}
