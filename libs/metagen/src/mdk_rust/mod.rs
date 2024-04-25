// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

//! Generates typegraph types and mdk interface for rust.
//! - dir/Cargo.toml
//!  - Will not be replaced on second generation.
//! - dir/gen.rs
//!  - Contains generated types and mdk interface.

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
    /// Runtimes to generate stubbed materializer implenetations for.
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
    /// Name of the crate to be put in the generated `Cargo.toml`
    #[garde(length(min = 1))]
    crate_name: Option<String>,
    // #[garde(skip)]
    // pub no_crate_manifest: Option<bool>,
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
            self.config.base.path.join("gen.rs"),
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
        out.insert(
            self.config.base.path.join("Cargo.toml"),
            GeneratedFile {
                contents: gen_cargo_toml(Some(&crate_name)),
                overwrite: false,
            },
        );
        Ok(GeneratorOutput(out))
    }
}

fn gen_mod_rs(config: &MdkRustGenConfig, tg: &Typegraph) -> anyhow::Result<String> {
    let mut mod_rs = GenDestBuf {
        buf: Default::default(),
    };
    _ = gen_static(&mut mod_rs);
    let mut ty_memo = Default::default();
    let gen_opts = types::GenTypesOptions {
        derive_debug: true,
        derive_serde: true,
    };
    writeln!(&mut mod_rs.buf, "use types::*;")?;
    writeln!(&mut mod_rs.buf, "pub mod types {{")?;
    writeln!(&mut mod_rs.buf, "    use super::*;")?;
    {
        let mut types_rs = GenDestBuf {
            buf: Default::default(),
        };
        // remove the root type which we don't want to generate types for
        // TODO: gql types || function wrappers for exposed functions
        // skip object 0, the root object where the `exposed` items are locted
        for id in 1..tg.types.len() {
            _ = types::gen_type(
                id as u32,
                &tg.types,
                &mut types_rs,
                &mut ty_memo,
                &gen_opts,
                &[],
            )?;
        }
        for line in types_rs.buf.lines() {
            if !line.is_empty() {
                writeln!(&mut mod_rs.buf, "    {line}")?;
            } else {
                writeln!(&mut mod_rs.buf)?;
            }
        }
    }
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
            let trait_name = stubs::gen_stub(fun, &mut stubs_rs, &ty_memo, &gen_stub_opts)?;
            if let Some(Some(op_name)) = fun.mat.data.get("op_name").map(|val| val.as_str()) {
                op_to_mat_map.insert(op_name.to_string(), trait_name);
            }
        }
        // TODO: op_to_mat_map
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

pub fn gen_cargo_toml(crate_name: Option<&str>) -> String {
    let lib_rs = include_str!("static/Cargo.toml");
    if let Some(crate_name) = crate_name {
        const DEF_CRATE_NAME: &str = "metagen_mdk_rust_static";
        lib_rs.replace(DEF_CRATE_NAME, crate_name)
    } else {
        lib_rs.to_string()
    }
}

pub fn gen_static(dest: &mut GenDestBuf) -> anyhow::Result<Arc<str>> {
    let mod_rs = include_str!("static/gen.rs").to_string();
    let mod_rs = mod_rs.replace("__METATYPE_VERSION__", std::env!("CARGO_PKG_VERSION"));

    let mdk_wit = include_str!("../../../../wit/wit-wire.wit");
    writeln!(&mut dest.buf, "// gen-static-start")?;
    write!(
        &mut dest.buf,
        "{}",
        &mod_rs[..mod_rs.find("//wit-start").unwrap()]
    )?;
    writeln!(
        &mut dest.buf,
        r#"
        inline: "{mdk_wit}""#
    )?;
    write!(
        &mut dest.buf,
        "{}",
        &mod_rs[mod_rs.find("//wit-end").unwrap() + "//wit-end".len()..]
    )?;
    writeln!(&mut dest.buf, "// gen-static-end")?;
    Ok("Ctx".into())
}

#[test]
fn mdk_rs_e2e() -> anyhow::Result<()> {
    use crate::tests::*;

    let tg_name = "gen-test";
    let config = config::Config {
        targets: [(
            "default".to_string(),
            config::Target(
                [(
                    "mdk_rust".to_string(),
                    serde_json::to_value(mdk_rust::MdkRustGenConfig {
                        stubbed_runtimes: Some(vec!["wasm".into()]),
                        crate_name: None,
                        base: config::MdkGeneratorConfigBase {
                            typegraph_name: Some(tg_name.into()),
                            typegraph_path: None,
                            // NOTE: root will map to the test's tempdir
                            path: "./".into(),
                        },
                    })?,
                )]
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
