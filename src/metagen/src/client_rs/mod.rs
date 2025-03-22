// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod node_metas;
mod selections;

use core::fmt::Write;

use fdk_rs::types::{RustTypesConfig, RustTypesSubmanifest};
use node_metas::RsNodeMeta;
use selections::RustSelectionManifestPage;
use shared::manifest::ManifestPage;
use shared::node_metas::MetasPageBuilder;
use tg_schema::EffectType;

use crate::interlude::*;
use crate::*;

use crate::fdk_rs::utils;
use crate::shared::client::*;

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

struct Maps {
    input_types: IndexMap<TypeKey, String>,
    output_types: IndexMap<TypeKey, String>,
    node_metas: IndexMap<TypeKey, String>,
    selections: IndexMap<TypeKey, String>,
}

struct RsClientManifest {
    tg: Arc<Typegraph>,
    types: RustTypesSubmanifest,
    node_metas: ManifestPage<RsNodeMeta>,
    selections: RustSelectionManifestPage,
    maps: Maps,
}

impl RsClientManifest {
    fn new(tg: Arc<Typegraph>) -> anyhow::Result<Self> {
        let types = RustTypesConfig::default()
            .partial_output_types(true)
            .derive_serde(true)
            .derive_debug(true)
            .build_manifest(&tg);
        let input_types_memo = types.inputs.get_cached_refs();
        let output_types_memo = types.outputs.get_cached_refs();

        let node_metas = MetasPageBuilder::new(tg.clone())?.build();
        node_metas.cache_references();
        let node_metas_memo = node_metas.get_cached_refs();

        let selections = selections::manifest_page(&tg, input_types_memo.clone());
        selections.cache_references();
        let selections_memo = selections.get_cached_refs();

        Ok(Self {
            tg,
            types,
            node_metas,
            selections,
            maps: Maps {
                input_types: input_types_memo,
                output_types: output_types_memo,
                node_metas: node_metas_memo,
                selections: selections_memo,
            },
        })
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
        let manif = RsClientManifest::new(tg.clone())?;
        let mut buf = String::new();
        manif.render(&mut buf)?;
        out.insert(
            self.config.base.path.join("client.rs"),
            GeneratedFile {
                contents: buf,
                overwrite: true,
            },
        );
        let crate_name = self.config.crate_name.clone().unwrap_or_else(|| {
            use heck::ToSnekCase;
            let tg_name = tg.name();
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

impl RsClientManifest {
    fn render(&self, dest: &mut impl Write) -> anyhow::Result<()> {
        writeln!(
            dest,
            "// This file was @generated by metagen and is intended"
        )?;
        writeln!(dest, "// to be generated again on subsequent metagen runs.")?;
        writeln!(dest)?;

        render_static(dest)?;

        self.types.render_full(dest)?;

        let methods = self.node_metas.render_all_buffered()?;
        with_metas_namespace(dest, methods)?;

        self.selections.render_all(dest)?;

        self.render_query_graph(dest)?;

        writeln!(dest)?;
        Ok(())
    }

    fn render_query_graph(&self, dest: &mut impl Write) -> anyhow::Result<()> {
        let gql_types = get_gql_types(&self.tg);

        write!(
            dest,
            r#"
impl QueryGraph {{

    pub fn new(addr: Url) -> Self {{
        Self {{
            addr,
            ty_to_gql_ty_map: std::sync::Arc::new(["#
        )?;

        for (key, gql_ty) in gql_types.into_iter() {
            let ty_name = self.tg.find_type(key).unwrap().name();
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

        self.render_meta_functions(dest)?;

        writeln!(
            dest,
            "
}}"
        )?;

        Ok(())
    }

    fn render_meta_functions(&self, dest: &mut impl Write) -> anyhow::Result<()> {
        for func in self.tg.root_functions() {
            let (path, ty) = func?;
            use heck::ToSnekCase;

            let node_name = path.join("_");
            let method_name = node_name.to_snek_case();
            let out_ty_name = self.maps.output_types.get(&ty.output().key()).unwrap();

            let arg_ty = ty
                .non_empty_input()
                .map(|ty| self.maps.input_types.get(&ty.key()).unwrap());

            let select_ty = self.maps.selections.get(&ty.output().key());

            let (marker_ty, node_ty) = match ty.effect() {
                EffectType::Read => ("QueryMarker", "QueryNode"),
                EffectType::Update | EffectType::Delete | EffectType::Create => {
                    ("MutationMarker", "MutationNode")
                }
            };

            let meta_method = self
                .maps
                .node_metas
                .get(&ty.key())
                .map(|s| s.as_str())
                .unwrap_or("scalar");

            let args_row = match &arg_ty {
                Some(arg_ty) => format!(
                    "
            args: impl Into<NodeArgs<{arg_ty}>>"
                ),
                None => "".into(),
            };

            match select_ty {
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
        Ok(())
    }
}

/// Render the common sections like the transports
fn render_static(out: &mut impl Write) -> core::fmt::Result {
    let client_rs = include_str!("static/client.rs");
    write!(out, "{}", client_rs)?;
    Ok(())
}

fn with_metas_namespace(dest: &mut impl Write, methods: String) -> std::fmt::Result {
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
    Ok(())
}

pub fn gen_cargo_toml(crate_name: Option<&str>) -> String {
    let crate_name = crate_name.unwrap_or("client_rs_static");

    #[cfg(debug_assertions)]
    let is_test = std::env::var("METAGEN_CLIENT_RS_TEST").ok().as_deref() == Some("1");

    #[cfg(debug_assertions)]
    let dependency = if is_test {
        use normpath::PathExt;
        let client_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../metagen-client-rs")
            .normalize()
            .unwrap();
        format!(
            r#"metagen-client = {{ path = "{client_path}" }}"#,
            client_path = client_path.as_path().to_str().unwrap()
        )
    } else {
        "metagen-client.workspace = true".to_string()
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
