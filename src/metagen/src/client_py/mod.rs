// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod node_metas;

mod selections;
mod utils;

use core::fmt::Write;

use fdk_py::types::PyTypesPage;
use node_metas::PyNodeMetasPage;
use selections::PySelectionsPage;
use shared::node_metas::MetasPageBuilder;
use tg_schema::EffectType;
use typegraph::TypeNodeExt as _;

use crate::interlude::*;
use crate::*;

use crate::shared::client::*;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct ClientPyGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
}

impl ClientPyGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: ClientPyGenConfig = serde_json::from_value(json)?;
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
    config: ClientPyGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: ClientPyGenConfig) -> Result<Self, garde::Report> {
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
        let manif = ClientPyManifest::new(tg.clone())?;
        let mut contents = String::new();
        manif.render(&mut contents, &self.config)?;
        out.insert(
            self.config.base.path.join("client.py"),
            GeneratedFile {
                contents,
                overwrite: true,
            },
        );

        Ok(GeneratorOutput(out))
    }
}

pub(super) struct Maps {
    pub(super) types: IndexMap<TypeKey, String>,
    node_metas: IndexMap<TypeKey, String>,
    selections: IndexMap<TypeKey, String>,
}

pub struct ClientPyManifest {
    tg: Arc<typegraph::Typegraph>,
    types: PyTypesPage,
    node_metas: PyNodeMetasPage,
    selections: PySelectionsPage,
    pub(super) maps: Maps,
}

impl ClientPyManifest {
    pub fn new(tg: Arc<typegraph::Typegraph>) -> anyhow::Result<Self> {
        let types = PyTypesPage::new(&tg);
        types.cache_references();
        let types_map = types.get_cached_refs();
        let node_metas = MetasPageBuilder::new(tg.clone())?.build();
        node_metas.cache_references();
        let selections = PySelectionsPage::new(&tg, types_map.clone());
        selections.cache_references();

        let maps = Maps {
            types: types_map,
            node_metas: node_metas.get_cached_refs(),
            selections: selections.get_cached_refs(),
        };

        Ok(Self {
            tg,
            types,
            node_metas,
            selections,
            maps,
        })
    }
}

impl ClientPyManifest {
    fn render(&self, dest: &mut impl Write, _config: &ClientPyGenConfig) -> anyhow::Result<()> {
        writeln!(
            dest,
            "# This file was @generated by metagen and is intended"
        )?;
        writeln!(dest, "# to be generated again on subsequent metagen runs.")?;
        writeln!(dest)?;

        self.render_client(dest, false)?;
        writeln!(dest)?;

        Ok(())
    }

    pub(super) fn render_client(
        &self,
        dest: &mut impl Write,
        _hostcall: bool,
    ) -> anyhow::Result<()> {
        render_static(dest)?;

        with_metas_namespace(dest, &self.node_metas.render_all_buffered()?)?;
        self.types.render_all(dest)?;
        self.selections.render_all(dest)?;

        self.render_query_graph(dest)?;

        Ok(())
    }

    // TODO render_without_header

    fn render_query_graph(&self, dest: &mut impl Write) -> anyhow::Result<()> {
        let gql_types = get_gql_types(&self.tg);

        write!(
            dest,
            r#"
class QueryGraph(QueryGraphBase):
    def __init__(self):
        super().__init__({{"#
        )?;
        for (key, gql_ty) in gql_types.into_iter() {
            let ty_name = self.tg.find_type(key).unwrap().name();
            write!(
                dest,
                r#"
            "{ty_name}": "{gql_ty}","#
            )?;
        }
        write!(
            dest,
            r#"
        }})
    "#
        )?;

        self.render_root_functions(dest)?;

        Ok(())
    }

    fn render_root_functions(&self, dest: &mut impl Write) -> anyhow::Result<()> {
        for func in self.tg.root_functions() {
            let (path, ty) = func?;
            use heck::ToSnekCase;

            let node_name = path.join("_");
            let method_name = node_name.to_snek_case();
            let out_ty_name = self.maps.types.get(&ty.output().key()).unwrap();

            let input_name = ty
                .non_empty_input()
                .map(|ty| self.maps.types.get(&ty.key()).unwrap());
            let selection_name = self.maps.selections.get(&ty.output().key());

            let (args_row, args_selection) = match (input_name, selection_name) {
                (Some(arg_ty), Some(select_ty)) => (
                    format!(
                        "self, args: typing.Union[{arg_ty}, PlaceholderArgs], select: {select_ty}"
                    ),
                    "(args, select)",
                ),
                // functions that return scalars don't need selections
                (Some(arg_ty), None) => (
                    format!("self, args: typing.Union[{arg_ty}, PlaceholderArgs]"),
                    "args",
                ),
                // not all functions have args (empty struct arg)
                (None, Some(select_ty)) => (format!("self, select: {select_ty}"), "select"),
                (None, None) => ("self".into(), "True"),
            };

            let meta_method = self
                .maps
                .node_metas
                .get(&ty.key())
                .map(|str| &str[..])
                .unwrap_or_else(|| "scalar");

            let node_type = match ty.effect() {
                EffectType::Read => "QueryNode",
                EffectType::Update | EffectType::Delete | EffectType::Create => "MutationNode",
            };

            write!(
                dest,
                r#"
    def {method_name}({args_row}) -> {node_type}[{out_ty_name}]:
        node = selection_to_nodes(
            {{"{node_name}": {args_selection}}}, 
            {{"{node_name}": NodeDescs.{meta_method}}}, 
            "$q"
        )[0]
        return {node_type}(node.node_name, node.instance_name, node.args, node.sub_nodes, node.files)
"#
            )?;
        }

        Ok(())
    }
}

/// Render the common sections like the transports
fn render_static(dest: &mut impl Write) -> core::fmt::Result {
    let client_py = include_str!("static/client.py");
    writeln!(dest, "{}", client_py)?;
    Ok(())
}

fn with_metas_namespace(dest: &mut impl Write, method_defs: &str) -> anyhow::Result<()> {
    write!(
        dest,
        r#"
class NodeDescs:
    @staticmethod
    def scalar():
        return NodeMeta()
    {method_defs}
"#
    )?;

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
                    generator_name: "client_py".to_string(),
                    other: serde_json::to_value(client_py::ClientPyGenConfig {
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
                        let status = tokio::process::Command::new("ruff")
                            .args("check client.py".split(' ').collect::<Vec<_>>())
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
