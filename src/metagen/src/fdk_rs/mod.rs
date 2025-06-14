// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! Generates typegraph types and fdk interface for rust.
//! - dir/Cargo.toml
//!  - Will not be replaced on second generation.
//! - dir/fdk.rs
//!  - Contains generated types and fdk interface.
//! - dir/lib.rs
//!  - Some directions to get the user started.
//!  - Will not be replaced on second generation.

mod stubs;
pub mod types;
pub mod utils;

use client_rs::GenClientRsOpts;
use client_rs::RsClientManifest;
use client_rs::RsClientManifestOpts;
use typegraph::ExpansionConfig;
use types::OutputTypes;
use types::RustTypesConfig;

use crate::interlude::*;
use crate::shared::*;
use crate::utils::*;
use crate::*;
use std::borrow::Cow;
use std::fmt::Write;

pub const DEFAULT_TEMPLATE: &[(&str, &str)] = &[("fdk.rs", include_str!("static/fdk.rs"))];

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct FdkRustGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
    /// Runtimes to generate stubbed materializer implementations for.
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
    /// Name of the crate to be put in the generated `Cargo.toml`
    #[garde(length(min = 1))]
    crate_name: Option<String>,
    #[garde(skip)]
    pub skip_cargo_toml: Option<bool>,
    #[garde(skip)]
    pub skip_lib_rs: Option<bool>,
    #[garde(skip)]
    pub exclude_client: Option<bool>,
}

impl FdkRustGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: FdkRustGenConfig = serde_json::from_value(json)?;
        config.base.path = workspace_path.join(config.base.path);
        config.base.typegraph_path = config
            .base
            .typegraph_path
            .as_ref()
            .map(|path| workspace_path.join(path));
        Ok(config)
    }
}

#[derive(Debug, Clone)]
struct FdkRustTemplate {
    mod_rs: Cow<'static, str>,
}

impl From<FdkTemplate> for FdkRustTemplate {
    fn from(template: FdkTemplate) -> Self {
        let mut template = template.entries;
        Self {
            mod_rs: template.swap_remove("fdk.rs").unwrap(),
        }
    }
}

pub struct Generator {
    config: FdkRustGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: FdkRustGenConfig) -> Result<Self, garde::Report> {
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
        .chain(std::iter::once((
            "template_dir".to_string(),
            GeneratorInputOrder::LoadFdkTemplate {
                default: DEFAULT_TEMPLATE,
                override_path: self.config.base.template_dir.clone(),
            },
        )))
        .collect()
    }

    fn generate(
        &self,
        mut inputs: IndexMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput> {
        // TODO remove code duplication in fdk generators
        let tg = match inputs
            .swap_remove(Self::INPUT_TG)
            .context("missing generator input for typegraph")?
        {
            GeneratorInputResolved::TypegraphFromTypegate { raw } => raw,
            GeneratorInputResolved::TypegraphFromPath { raw } => raw,
            _ => bail!("unexpected generator input variant"),
        };

        let template: FdkRustTemplate = match inputs
            .swap_remove("template_dir")
            .context("missing generator input for template_dir")?
        {
            GeneratorInputResolved::FdkTemplate { template } => template.into(),
            _ => bail!("unexpected generator input variant"),
        };

        let mut out = IndexMap::new();

        let tg = ExpansionConfig::with_default_engines()
            .conservative()
            .expand(tg)?;

        out.insert(
            self.config.base.path.join("fdk.rs"),
            GeneratedFile {
                contents: template.gen_mod_rs(&self.config, tg.clone())?,
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
                    contents: gen_cargo_toml(
                        Some(&crate_name),
                        !self.config.exclude_client.unwrap_or_default(),
                    ),
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

#[derive(Debug)]
struct Maps {
    inputs: IndexMap<TypeKey, String>,
    // partial_outputs: IndexMap<TypeKey, String>,
    outputs: IndexMap<TypeKey, String>,
}

impl FdkRustTemplate {
    fn gen_mod_rs(&self, config: &FdkRustGenConfig, tg: Arc<Typegraph>) -> anyhow::Result<String> {
        let mut mod_rs = GenDestBuf {
            buf: Default::default(),
        };
        writeln!(
            &mut mod_rs.buf,
            "// This file was @generated by metagen and is intended"
        )?;
        writeln!(
            &mut mod_rs.buf,
            "// to be generated again on subsequent metagen runs."
        )?;
        writeln!(&mut mod_rs.buf, "#![cfg_attr(rustfmt, rustfmt_skip)]")?;
        writeln!(&mut mod_rs.buf)?;
        self.gen_static(&mut mod_rs, config)?;

        let maps = if config.exclude_client.unwrap_or_default() {
            info!("building render manifest...");
            let manifest = RustTypesConfig::default()
                .output_types(OutputTypes::NonPartial)
                .derive_serde(true)
                .derive_debug(true)
                .build_manifest(&tg);
            info!("rendering...");
            manifest.render_full(&mut mod_rs.buf)?;
            info!("rendering done successfully");

            Maps {
                inputs: manifest.inputs.get_cached_refs(),
                outputs: manifest
                    .outputs
                    .as_ref()
                    .map(|p| p.get_cached_refs())
                    .unwrap_or_default(),
            }
        } else {
            info!("building render manifest...");
            let manifest = RsClientManifest::new(
                tg.clone(),
                &RsClientManifestOpts {
                    non_partial_output_types: true,
                },
            )?;
            info!("rendering...");
            manifest.render_client(&mut mod_rs.buf, &GenClientRsOpts { hostcall: true })?;
            info!("rendering done successfully");
            Maps {
                inputs: manifest.maps.input_types,
                outputs: manifest.maps.output_types,
            }
        };

        writeln!(&mut mod_rs.buf, "pub mod stubs {{")?;
        writeln!(&mut mod_rs.buf, "    use super::*;")?;
        {
            let mut stubs_rs = GenDestBuf {
                buf: Default::default(),
            };
            let gen_stub_opts = stubs::GenStubOptions {};
            let stubbed_rts = config
                .stubbed_runtimes
                .clone()
                .unwrap_or_else(|| vec!["wasm_wire".to_string()]);
            let stubbed_funs = filter_stubbed_funcs(&tg, &stubbed_rts).wrap_err_with(|| {
                format!("error collecting materializers for runtimes {stubbed_rts:?}")
            })?;
            let mut op_to_mat_map = BTreeMap::new();
            for fun in &stubbed_funs {
                let trait_name = stubs::gen_stub(fun, &mut stubs_rs, &maps, &gen_stub_opts)?;
                if let Some(Some(op_name)) =
                    fun.materializer.data.get("op_name").map(|val| val.as_str())
                {
                    op_to_mat_map.insert(op_name.to_string(), trait_name);
                }
            }
            stubs::gen_op_to_mat_map(&op_to_mat_map, &mut stubs_rs, &gen_stub_opts)?;

            for line in stubs_rs.buf.lines() {
                if !line.is_empty() {
                    writeln!(&mut mod_rs.buf, "    {line}")?;
                } else {
                    writeln!(&mut mod_rs.buf)?;
                }
            }
        }
        writeln!(&mut mod_rs.buf, "}}")?;
        Ok(mod_rs.buf)
    }

    pub fn gen_static(
        &self,
        dest: &mut GenDestBuf,
        config: &FdkRustGenConfig,
    ) -> anyhow::Result<()> {
        let mod_rs = self.mod_rs.clone().into_owned();
        let mod_rs = mod_rs.replace("__METATYPE_VERSION__", std::env!("CARGO_PKG_VERSION"));

        let fdk_wit = include_str!("../../../wit/wit-wire.wit");
        writeln!(dest, "// gen-static-start")?;

        let gen_start = "// gen-start\n";
        let wit_start = "// wit-start\n";

        let flags = [(
            "HOSTCALL".to_string(),
            !config.exclude_client.unwrap_or_default(),
        )]
        .into_iter()
        .collect();

        processed_write(
            dest,
            &mod_rs[mod_rs.find(gen_start).unwrap() + gen_start.len()
                ..mod_rs.find(wit_start).unwrap()],
            &flags,
        )?;

        processed_write(
            dest,
            &format!(
                r#"
        inline: "{fdk_wit}""#
            ),
            &flags,
        )?;

        let gen_end = "// gen-end\n";
        let wit_end = "// wit-end\n";
        processed_write(
            &mut dest.buf,
            &mod_rs[mod_rs.find(wit_end).unwrap() + wit_end.len()..mod_rs.find(gen_end).unwrap()],
            &flags,
        )?;

        writeln!(&mut dest.buf, "// gen-static-end")?;
        Ok(())
    }
}

fn gen_cargo_toml(crate_name: Option<&str>, hostcall: bool) -> String {
    let crate_name = crate_name.unwrap_or("fdk_rs");

    let dependency = if hostcall {
        #[cfg(debug_assertions)]
        {
            use normpath::PathExt;
            let client_path = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../metagen-client-rs")
                .normalize()
                .unwrap();
            format!(
                r#"metagen-client = {{ path = "{client_path}", default-features = false }}"#,
                client_path = client_path.as_path().to_str().unwrap()
            )
        }

        #[cfg(not(debug_assertions))]
        format!(
            "metagen-client = {{ git = \"https://github.com/metatypedev/metatype.git\", tag = \"{version}\", default-features = false }}",
            version = env!("CARGO_PKG_VERSION")
        )
    } else {
        "".to_string()
    };

    format!(
        r#"[package]
name = "{crate_name}"
edition = "2021"
version = "0.0.1"
[dependencies]
{dependency}
anyhow = "1"
serde = {{ version = "1", features = ["derive"] }}
serde_json = "1"
wit-bindgen = "0.34"
# The options after here are configured for crates intended to be
# wasm artifacts. Remove them if your usage is different
[lib]
path = "lib.rs"
crate-type = ["cdylib", "rlib"]
[profile.release]
strip = "symbols"
opt-level = "z"
"#
    )
}

pub fn gen_lib_rs() -> String {
    r#"
mod fdk;
pub use fdk::*;

/*
init_mat! {
    hook: || {FdkGeneratorConfigBase
        // initialize global stuff here if you need it
        MatBuilder::new()
            // register function handlers here
            .register_handler(stubs::MyFunc::erased(MyMat))
    }
}

struct MyMat;

// FIXME: use actual types from your fdk here
impl stubs::MyFunc for MyMat {
    fn handle(&self, input: types::MyFuncIn, _cx: Ctx) -> anyhow::Result<types::MyFuncOut> {
        unimplemented!()
    }
}
*/
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
                    generator_name: "fdk_rs".to_string(),
                    other: serde_json::to_value(fdk_rs::FdkRustGenConfig {
                        skip_cargo_toml: None,
                        skip_lib_rs: Some(true),
                        stubbed_runtimes: Some(vec!["wasm_wire".into()]),
                        crate_name: None,
                        exclude_client: None,
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
            let tg = test_typegraph_1().await?;
            e2e_test(vec![E2eTestCase {
                typegraphs: [(tg_name.to_string(), tg)].into_iter().collect(),
                target: "default".into(),
                config,
                build_fn: |args| {
                    Box::pin(async move {
                        let status = tokio::process::Command::new("cargo")
                            .args(
                                "clippy --target wasm32-wasip1"
                                    .split(' ')
                                    .collect::<Vec<_>>(),
                            )
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
                target_dir: Some("./fixtures/mat_rust/".into()),
            }])
            .await
        })?;
    Ok(())
}
