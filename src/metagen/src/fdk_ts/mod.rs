// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod types;
pub mod utils;

use core::fmt::Write;
use std::borrow::Cow;

use typegraph::TypeNodeExt as _;

use crate::interlude::*;
use crate::shared::*;
use crate::*;

use crate::utils::GenDestBuf;

use self::shared::types::TypeRenderer;

pub const DEFAULT_TEMPLATE: &[(&str, &str)] = &[("fdk.ts", include_str!("static/fdk.ts"))];

struct FdkTypescriptTemplate {
    fdk_ts: Cow<'static, str>,
}

impl From<FdkTemplate> for FdkTypescriptTemplate {
    fn from(mut fdk_template: FdkTemplate) -> Self {
        let fdk_ts = fdk_template.entries.swap_remove("fdk.ts").unwrap();
        Self {
            fdk_ts: fdk_ts.clone(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct FdkTypescriptGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
    /// Runtimes to generate stubbed materializer implementations for.
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
}

impl FdkTypescriptGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: FdkTypescriptGenConfig = serde_json::from_value(json)?;
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
    config: FdkTypescriptGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";

    pub fn new(config: FdkTypescriptGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate()?;
        Ok(Self { config })
    }
}

impl FdkTypescriptTemplate {
    fn render_fdk_ts(
        &self,
        config: &FdkTypescriptGenConfig,
        tg: Arc<Typegraph>,
    ) -> anyhow::Result<String> {
        let mut fdk_ts = GenDestBuf {
            buf: Default::default(),
        };
        writeln!(
            &mut fdk_ts,
            "// This file was @generated by metagen and is intended"
        )?;
        writeln!(
            &mut fdk_ts,
            "// to be generated again on subsequent metagen runs."
        )?;
        writeln!(&mut fdk_ts)?;
        self.gen_static(&mut fdk_ts)?;
        // let ty_name_memo = render_types(&mut fdk_ts, tg.clone())?;
        // eprintln!("ty_name_memo: {:#?}", ty_name_memo);
        writeln!(&mut fdk_ts)?;
        {
            let stubbed_rts = config
                .stubbed_runtimes
                .clone()
                .unwrap_or_else(|| vec!["deno".to_string()]);
            let stubbed_funs = filter_stubbed_funcs(&tg, &stubbed_rts).wrap_err_with(|| {
                format!("error collecting materializers for runtimes {stubbed_rts:?}")
            })?;
            for fun in &stubbed_funs {
                // let inp_ty = ty_name_memo
                //     .get(&fun.input().name())
                //     .context("input type for function not found")?;
                // let out_ty = ty_name_memo
                //     .get(&fun.output().name())
                //     .context("output type for function not found")?;
                let inp_ty = utils::normalize_type_title(&fun.input().name());
                let out_ty = utils::normalize_type_title(&fun.output().name());
                let type_name: String = utils::normalize_type_title(&fun.name());
                writeln!(
                    &mut fdk_ts,
                    "export type {type_name}Handler = Handler<{inp_ty}, {out_ty}>;"
                )?;
            }
        }
        Ok(fdk_ts.buf)
    }

    pub fn gen_static(&self, dest: &mut GenDestBuf) -> core::fmt::Result {
        let fdk_ts = self.fdk_ts.as_ref();
        writeln!(dest, "{}", fdk_ts)?;
        Ok(())
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
        let tg = match inputs
            .swap_remove(Self::INPUT_TG)
            .context("missing generator input")?
        {
            GeneratorInputResolved::TypegraphFromTypegate { raw } => raw,
            GeneratorInputResolved::TypegraphFromPath { raw } => raw,
            _ => unreachable!(),
        };
        let template: FdkTypescriptTemplate = match inputs.swap_remove("template_dir").unwrap() {
            GeneratorInputResolved::FdkTemplate { template } => template.into(),
            _ => unreachable!(),
        };

        let mut out = IndexMap::new();
        out.insert(
            self.config.base.path.join("fdk.ts"),
            GeneratedFile {
                contents: template.render_fdk_ts(&self.config, tg)?,
                overwrite: true,
            },
        );

        Ok(GeneratorOutput(out))
    }
}

fn render_types(dest: &mut GenDestBuf, tg: Arc<Typegraph>) -> anyhow::Result<()> {
    let mut renderer = TypeRenderer::new(tg.clone(), Arc::new(types::TypescriptTypeRenderer {}));
    // remove the root type which we don't want to generate types for
    // TODO: gql types || function wrappers for exposed functions
    // skip object 0, the root object where the `exposed` items are locted
    for ty in tg.named.values() {
        _ = renderer.render(ty)?;
    }
    let types_ts = renderer.finalize();
    writeln!(dest.buf, "{}", types_ts)?;
    Ok(())
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
                    generator_name: "fdk_ts".to_string(),
                    other: serde_json::to_value(fdk_ts::FdkTypescriptGenConfig {
                        stubbed_runtimes: Some(vec!["deno".into()]),
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
                        println!(
                            "file content:fdk.ts:\n{}\n--end--",
                            std::fs::read_to_string(args.path.join("fdk.ts"))?
                        );
                        let status = tokio::process::Command::new("deno")
                            .args("check fdk.ts".split(' ').collect::<Vec<_>>())
                            .current_dir(&args.path)
                            .kill_on_drop(true)
                            .spawn()?
                            .wait()
                            .await?;
                        if !status.success() {
                            anyhow::bail!("error checking generated crate");
                        }
                        let status = tokio::process::Command::new("deno")
                            .args("lint fdk.ts".split(' ').collect::<Vec<_>>())
                            .current_dir(&args.path)
                            .kill_on_drop(true)
                            .spawn()?
                            .wait()
                            .await?;
                        if !status.success() {
                            anyhow::bail!("error lint generated crate");
                        }
                        Ok(())
                    })
                },
                target_dir: None,
            }])
            .await
        })?;
    Ok(())
}
