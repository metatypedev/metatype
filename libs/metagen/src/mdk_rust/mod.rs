// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod stubs;
mod types;
mod utils;

use crate::interlude::*;
use crate::mdk::*;
use crate::utils::*;
use crate::*;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkRustGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::MdkGeneratorConfigBase,
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
    #[garde(skip)]
    pub no_crate_manifest: Option<bool>,
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
            GeneratorInputOrder::TypegraphDesc {
                name: self.config.base.typegraph_name.clone(),
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
        let GeneratorInputResolved::TypegraphDesc { raw: tg } = inputs
            .get(Self::INPUT_TG)
            .context("missing generator input")?;
        let mut out = HashMap::new();
        out.insert(
            self.config.base.path.join("mod.rs"),
            gen_mod_rs(&self.config, &tg)?,
        );
        if self.config.no_crate_manifest.unwrap_or(true) {
            use heck::ToSnekCase;
            let crate_name = format!("{}_mdk", self.config.base.typegraph_name.to_snek_case());
            out.insert(
                self.config.base.path.join("Cargo.toml"),
                gen_cargo_toml(Some(&crate_name)),
            );
        }
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
    // remove the root type which we don't want to generate types for
    // TODO: gql types || function wrappers for exposed functions
    // skip object 0, the root object where the `exposed` items are locted
    for id in 1..tg.types.len() {
        _ = types::gen_type(
            id as u32,
            &tg.types,
            &mut mod_rs,
            &mut ty_memo,
            &gen_opts,
            &[],
        )?;
    }
    if let Some(stubbed_rts) = &config.stubbed_runtimes {
        let stubbed_funs = filter_stubbed_funcs(tg, stubbed_rts)?;
        let gen_stub_opts = stubs::GenStubOptions {};
        for fun in &stubbed_funs {
            _ = stubs::gen_stub(fun, &mut mod_rs, &ty_memo, &gen_stub_opts)
        }
    }
    Ok(mod_rs.buf)
}

pub fn gen_cargo_toml(crate_name: Option<&str>) -> String {
    let lib_rs = include_str!("static/Cargo.toml");
    if let Some(crate_name) = crate_name {
        static DEF_CRATE_NAME: &'static str = "metagen_mdk_rust_static";
        lib_rs.replace(DEF_CRATE_NAME, crate_name)
    } else {
        lib_rs.to_string()
    }
}

pub fn gen_static(dest: &mut GenDestBuf) -> anyhow::Result<Arc<str>> {
    use std::fmt::Write;

    let mod_rs = include_str!("static/mod.rs");
    let mdk_wit = include_str!("../mdk/mdk.wit");
    writeln!(&mut dest.buf, "// gen-static-start")?;
    write!(
        &mut dest.buf,
        "{}",
        &mod_rs[..mod_rs.find("//wit-start").unwrap()]
    )?;
    writeln!(
        &mut dest.buf,
        r#"
    inline: "{mdk_wit}"
"#
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
                        stubbed_runtimes: None,
                        no_crate_manifest: None,
                        base: config::MdkGeneratorConfigBase {
                            typegraph_name: tg_name.into(),
                            // NOTE: root will map to the test's tempdir
                            path: "./gen/".into(),
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
    let out = tokio::runtime::Builder::new_multi_thread()
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
                                "build --target wasm32-wasi --target-dir target/wasi"
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
                target_dir: "./tests/mat_rust/".into(),
            }])
            .await
        })?;
    dbg!(out);
    Ok(())
}
