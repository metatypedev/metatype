// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use core::fmt::Write;
use std::borrow::Cow;

use crate::interlude::*;
use crate::shared::*;
use crate::utils::GenDestBuf;
use crate::*;
use client_py::ClientPyManifest;
use types::PyTypesPage;

pub mod types;

pub const DEFAULT_TEMPLATE: &[(&str, &str)] = &[("fdk.py", include_str!("static/fdk.py"))];

struct FdkPythonTemplate {
    fdk_py: Cow<'static, str>,
}

impl From<FdkTemplate> for FdkPythonTemplate {
    fn from(mut fdk_template: FdkTemplate) -> Self {
        let fdk_py = fdk_template.entries.swap_remove("fdk.py").unwrap();
        Self {
            fdk_py: fdk_py.clone(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct FdkPythonGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
    /// Runtimes to generate stubbed materializer implementations for.
    #[garde(skip)]
    pub stubbed_runtimes: Option<Vec<String>>,
    #[garde(skip)]
    pub exclude_client: Option<bool>,
}

impl FdkPythonGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: FdkPythonGenConfig = serde_json::from_value(json)?;
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
    config: FdkPythonGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";

    pub fn new(config: FdkPythonGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate()?;
        Ok(Self { config })
    }
}

impl FdkPythonTemplate {
    fn render_fdk_py(
        &self,
        config: &FdkPythonGenConfig,
        tg: Arc<Typegraph>,
    ) -> anyhow::Result<String> {
        let mut fdk_py = GenDestBuf {
            buf: Default::default(),
        };
        writeln!(
            &mut fdk_py,
            "# This file was @generated by metagen and is intended"
        )?;
        writeln!(
            &mut fdk_py,
            "# to be generated again on subsequent metagen runs."
        )?;
        writeln!(&mut fdk_py)?;
        self.gen_static(&mut fdk_py)?;
        let ty_name_memo = if config.exclude_client.unwrap_or_default() {
            let manif = PyTypesPage::new(&tg);
            manif.cache_references();
            manif.render_all(&mut fdk_py)?;
            manif.get_cached_refs()
        } else {
            let manif = ClientPyManifest::new(tg.clone())?;
            manif.render_client(&mut fdk_py, true)?;
            manif.maps.types
        };
        writeln!(&mut fdk_py)?;
        {
            let stubbed_rts = config
                .stubbed_runtimes
                .clone()
                .unwrap_or_else(|| vec!["python".to_string()]);
            let stubbed_funs = filter_stubbed_funcs(&tg, &stubbed_rts).wrap_err_with(|| {
                format!("error collecting materializers for runtimes {stubbed_rts:?}")
            })?;
            for fun in &stubbed_funs {
                let def_name = serde_json::from_value::<String>(
                    fun.materializer
                        .data
                        .get("name")
                        .wrap_err("missing python mod name")
                        .unwrap()
                        .clone(),
                )?;
                let inp_ty = ty_name_memo
                    .get(&fun.input().key())
                    .ok_or_eyre("input type for function not found")?;
                let out_ty = ty_name_memo
                    .get(&fun.output().key())
                    .ok_or_eyre("output type for function not found")?;
                writeln!(
                    &mut fdk_py,
                    r#"
def handler_{def_name}(user_fn: typing.Callable[[{inp_ty}, Ctx], {out_ty}]):
    def wrapper(raw_inp, gql_fn):
        qg = QueryGraph()
        host = Transports.hostcall(qg, gql_fn)
        cx = Ctx(gql_fn, qg, host)
        return user_fn(raw_inp, cx)

    return wrapper

                    "#
                )?;
            }
        }
        static IF_END: once_cell::sync::Lazy<regex::Regex> =
            once_cell::sync::Lazy::new(|| regex::Regex::new(r"^(from|import)").unwrap());
        fdk_py.buf = crate::utils::collect_at_first_instance(&fdk_py.buf, &IF_END);
        Ok(fdk_py.buf)
    }

    pub fn gen_static(&self, dest: &mut GenDestBuf) -> eyre::Result<()> {
        let fdk_py = self.fdk_py.as_ref();
        utils::processed_write(
            dest,
            fdk_py,
            &[("HOSTCALL".to_string(), true)].into_iter().collect(),
        )?;
        writeln!(dest)?;
        writeln!(dest)?;
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
        let template: FdkPythonTemplate = match inputs.swap_remove("template_dir").unwrap() {
            GeneratorInputResolved::FdkTemplate { template } => template.into(),
            _ => unreachable!(),
        };

        let mut out = IndexMap::new();
        out.insert(
            self.config.base.path.join("fdk.py"),
            GeneratedFile {
                contents: template.render_fdk_py(&self.config, tg)?,
                overwrite: true,
            },
        );

        Ok(GeneratorOutput(out))
    }
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
                    generator_name: "fdk_py".to_string(),
                    other: serde_json::to_value(fdk_py::FdkPythonGenConfig {
                        stubbed_runtimes: Some(vec!["deno".into()]),
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
                        let status = tokio::process::Command::new("ruff")
                            .args("check fdk.py".split(' ').collect::<Vec<_>>())
                            .current_dir(&args.path)
                            .kill_on_drop(true)
                            .spawn()?
                            .wait()
                            .await?;
                        if !status.success() {
                            anyhow::bail!("error checking generated module");
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
