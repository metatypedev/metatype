// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! Generates typegraph types and mdk interface for rust.
//! - dir/Cargo.toml
//!  - Will not be replaced on second generation.
//! - dir/mdk.rs
//!  - Contains generated types and mdk interface.
//! - dir/lib.rs
//!  - Some directions to get the user started.
//!  - Will not be replaced on second generation.

mod stubs;
mod types;
mod utils;

use crate::interlude::*;
use crate::mdk::*;
use crate::utils::*;
use crate::*;

use std::fmt::Write;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkRustGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::MdkGeneratorConfigBase,
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
}

impl MdkRustGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: mdk_rust::MdkRustGenConfig = serde_json::from_value(json)?;
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
    config: MdkRustGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: MdkRustGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate(&())?;
        Ok(Self { config })
    }
}

impl crate::Plugin for Generator {
    fn bill_of_inputs(&self) -> HashMap<String, GeneratorInputOrder> {
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
        inputs: HashMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput> {
        // return Ok(GeneratorOutput(Default::default()))
        let tg = match inputs
            .get(Self::INPUT_TG)
            .context("missing generator input")?
        {
            GeneratorInputResolved::TypegraphFromTypegate { raw } => raw,
            GeneratorInputResolved::TypegraphFromPath { raw } => raw,
        };
        let mut out = HashMap::new();
        out.insert(
            self.config.base.path.join("mdk.rs"),
            GeneratedFile {
                contents: gen_mod_rs(&self.config, tg)?,
                overwrite: true,
            },
        );
        let crate_name = self.config.crate_name.clone().unwrap_or_else(|| {
            use heck::ToSnekCase;
            let tg_name = tg.name().unwrap_or_else(|_| "generated".to_string());
            format!("{}_mdk", tg_name.to_snek_case())
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

fn gen_mod_rs(config: &MdkRustGenConfig, tg: &Typegraph) -> anyhow::Result<String> {
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
    gen_static(&mut mod_rs)?;
    writeln!(&mut mod_rs.buf, "use types::*;")?;
    writeln!(&mut mod_rs.buf, "pub mod types {{")?;
    writeln!(&mut mod_rs.buf, "    use super::*;")?;
    let ty_name_memo = {
        let mut renderer = mdk::types::TypeRenderer::new(
            &tg.types,
            Rc::new(types::RustTypeRenderer {
                derive_serde: true,
                derive_debug: true,
            }),
        );
        // remove the root type which we don't want to generate types for
        // TODO: gql types || function wrappers for exposed functions
        // skip object 0, the root object where the `exposed` items are locted
        for id in 1..tg.types.len() {
            _ = renderer.render(id as u32)?;
        }
        let (types_rs, name_memo) = renderer.finalize();
        for line in types_rs.lines() {
            if !line.is_empty() {
                writeln!(&mut mod_rs.buf, "    {line}")?;
            } else {
                writeln!(&mut mod_rs.buf)?;
            }
        }
        name_memo
    };
    writeln!(&mut mod_rs.buf, "}}")?;
    writeln!(&mut mod_rs.buf, "use stubs::*;")?;
    writeln!(&mut mod_rs.buf, "pub mod stubs {{")?;
    writeln!(&mut mod_rs.buf, "    use super::*;")?;
    {
        let mut stubs_rs = GenDestBuf {
            buf: Default::default(),
        };
        let gen_stub_opts = stubs::GenStubOptions {};
        let stubbed_rts = config.stubbed_runtimes.clone().unwrap_or_default();
        let stubbed_funs = filter_stubbed_funcs(tg, &stubbed_rts)?;
        let mut op_to_mat_map = HashMap::new();
        for fun in &stubbed_funs {
            let trait_name = stubs::gen_stub(fun, &mut stubs_rs, &ty_name_memo, &gen_stub_opts)?;
            if let Some(Some(op_name)) = fun.mat.data.get("op_name").map(|val| val.as_str()) {
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

pub fn gen_static(dest: &mut GenDestBuf) -> core::fmt::Result {
    let mod_rs = include_str!("static/mdk.rs").to_string();
    let mod_rs = mod_rs.replace("__METATYPE_VERSION__", std::env!("CARGO_PKG_VERSION"));

    let mdk_wit = include_str!("../../../../wit/wit-wire.wit");
    writeln!(dest, "// gen-static-start")?;

    let gen_start = "// gen-start\n";
    let wit_start = "// wit-start\n";
    write!(
        &mut dest.buf,
        "{}",
        &mod_rs[mod_rs.find(gen_start).unwrap() + gen_start.len()..mod_rs.find(wit_start).unwrap()]
    )?;

    writeln!(
        &mut dest.buf,
        r#"
        inline: "{mdk_wit}""#
    )?;

    let gen_end = "// gen-end\n";
    let wit_end = "// wit-end\n";
    write!(
        &mut dest.buf,
        "{}",
        &mod_rs[mod_rs.find(wit_end).unwrap() + wit_end.len()..mod_rs.find(gen_end).unwrap()]
    )?;

    writeln!(&mut dest.buf, "// gen-static-end")?;
    Ok(())
}

pub fn gen_cargo_toml(crate_name: Option<&str>) -> String {
    let cargo_toml = include_str!("static/Cargo.toml");
    let mut cargo_toml = if let Some(crate_name) = crate_name {
        const DEF_CRATE_NAME: &str = "metagen_mdk_rust_static";
        cargo_toml.replace(DEF_CRATE_NAME, crate_name)
    } else {
        cargo_toml.to_string()
    };
    cargo_toml.push_str(
        r#"

[profile.release]
strip = "symbols"
opt-level = "z""#,
    );
    cargo_toml
}

pub fn gen_lib_rs() -> String {
    r#"
mod mdk;
pub use mdk::*;

/*
init_mat! {
    hook: || {
        // initialize global stuff here if you need it
        MatBuilder::new() 
            // register function handlers here
            .register_handler(stubs::MyFunc::erased(MyMat))
    }
}

struct MyMat;

// FIXME: use actual types from your mdk here
impl stubs::MyFunc for MyMat {
    fn handle(&self, input: types::MyFuncIn, _cx: Ctx) -> anyhow::Result<types::MyFuncOut> {
        unimplemented!()
    }
}
*/
"#
    .into()
}

#[cfg(feature = "multithreaded")]
#[test]
fn mdk_rs_e2e() -> anyhow::Result<()> {
    use crate::tests::*;

    let tg_name = "gen-test";
    let config = config::Config {
        targets: [(
            "default".to_string(),
            config::Target(
                [GeneratorConfig {
                    generator_name: "mdk_rust".to_string(),
                    other: serde_json::to_value(mdk_rust::MdkRustGenConfig {
                        skip_cargo_toml: None,
                        skip_lib_rs: Some(true),
                        stubbed_runtimes: Some(vec!["wasm_wire".into()]),
                        crate_name: None,
                        base: config::MdkGeneratorConfigBase {
                            typegraph_name: Some(tg_name.into()),
                            typegraph_path: None,
                            // NOTE: root will map to the test's tempdir
                            path: "./".into(),
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
                            .args("build --target wasm32-wasi".split(' ').collect::<Vec<_>>())
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
                target_dir: "./tests/mat_rust/".into(),
            }])
            .await
        })?;
    Ok(())
}
