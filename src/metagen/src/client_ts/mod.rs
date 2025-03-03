// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod node_metas;
mod selections;

use core::fmt::Write;

use shared::get_gql_type;
use tg_schema::EffectType;

use crate::interlude::*;
use crate::*;

use crate::fdk_ts::utils;
use crate::shared::client::*;
use crate::shared::types::NameMemo;
use crate::shared::types::TypeRenderer;
use crate::utils::GenDestBuf;
use utils::normalize_type_title;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct ClienTsGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
}

impl ClienTsGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: ClienTsGenConfig = serde_json::from_value(json)?;
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
    config: ClienTsGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: ClienTsGenConfig) -> Result<Self, garde::Report> {
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
            self.config.base.path.join("client.ts"),
            GeneratedFile {
                contents: render_client_ts(&self.config, tg)?,
                overwrite: true,
            },
        );

        Ok(GeneratorOutput(out))
    }
}

fn render_client_ts(_config: &ClienTsGenConfig, tg: &Typegraph) -> anyhow::Result<String> {
    let mut client_ts = GenDestBuf {
        buf: Default::default(),
    };

    writeln!(
        &mut client_ts,
        "// This file was @generated by metagen and is intended"
    )?;
    writeln!(
        &mut client_ts,
        "// to be generated again on subsequent metagen runs."
    )?;
    writeln!(&mut client_ts)?;

    render_client(&mut client_ts, tg, ClientTsOpts { hostcall: false })?;

    writeln!(&mut client_ts)?;
    Ok(client_ts.buf)
}

pub struct ClientTsOpts {
    pub hostcall: bool,
}

pub fn render_client(
    dest: &mut GenDestBuf,
    tg: &Typegraph,
    opts: ClientTsOpts,
) -> anyhow::Result<NameMemo> {
    render_static(dest, opts.hostcall)?;

    let manifest = get_manifest(tg)?;

    let name_mapper = NameMapper {
        nodes: tg.types.iter().cloned().map(Rc::new).collect(),
        memo: Default::default(),
    };
    let name_mapper = Rc::new(name_mapper);

    let (node_metas, named_types) = render_node_metas(dest, &manifest, name_mapper.clone())?;
    let data_types = render_data_types(dest, &manifest, name_mapper.clone())?;
    let data_types = Rc::new(data_types);
    let selection_names =
        render_selection_types(dest, &manifest, data_types.clone(), name_mapper.clone())?;

    write!(
        dest,
        r#"
export class QueryGraph extends _QueryGraphBase {{
  constructor() {{
    super({{"#
    )?;
    for (&id, ty_name) in name_mapper.memo.borrow().deref() {
        let gql_ty = get_gql_type(&tg.types, id, false);
        write!(
            dest,
            r#"
      "{ty_name}": "{gql_ty}","#
        )?;
    }
    for id in named_types {
        let ty_name = &tg.types[id as usize].base().title;
        let gql_ty = get_gql_type(&tg.types, id, false);
        write!(
            dest,
            r#"
      "{ty_name}": "{gql_ty}","#
        )?;
    }
    write!(
        dest,
        r#"
    }});
  }}
    "#
    )?;

    for fun in manifest.root_fns {
        use heck::ToLowerCamelCase;

        let node_name = fun.name;
        let method_name = node_name.to_lower_camel_case();
        let out_ty_name = data_types.get(&fun.out_id).unwrap();

        let args_row = match (
            fun.in_id.map(|id| data_types.get(&id).unwrap()),
            fun.select_ty.map(|id| selection_names.get(&id).unwrap()),
        ) {
            (Some(arg_ty), Some(select_ty)) => {
                format!("args: {arg_ty} | PlaceholderArgs<{arg_ty}>, select: {select_ty}")
            }
            // functions that return scalars don't need selections
            (Some(arg_ty), None) => format!("args: {arg_ty} | PlaceholderArgs<{arg_ty}>"),
            // not all functions have args (empty struct arg)
            (None, Some(select_ty)) => format!("select: {select_ty}"),
            (None, None) => "".into(),
        };

        let args_selection = match (fun.in_id, fun.select_ty) {
            (Some(_), Some(_)) => "[args, select]",
            (Some(_), None) => "args",
            (None, Some(_)) => "select",
            (None, None) => "true",
        };

        let meta_method = node_metas
            .get(&fun.id)
            .map(|str| &str[..])
            .unwrap_or_else(|| "scalar");

        let node_type = match fun.effect {
            EffectType::Read => "QueryNode",
            EffectType::Update | EffectType::Delete | EffectType::Create => "MutationNode",
        };

        write!(
            dest,
            r#"
  {method_name}({args_row}): {node_type}<{out_ty_name}> {{
    const inner = _selectionToNodeSet(
      {{ "{node_name}": {args_selection} }},
      [["{node_name}", nodeMetas.{meta_method}]],
      "$q",
    )[0];
    return new {node_type}(inner);
  }}"#
        )?;
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
    let client_ts = include_str!("static/mod.ts");
    crate::utils::processed_write(
        dest,
        client_ts,
        [("HOSTCALL".to_string(), hostcall)].into_iter().collect(),
    )?;
    Ok(())
}

/// Render the types that'll actually hold the data, the ones
/// used for serialization
fn render_data_types(
    dest: &mut GenDestBuf,
    manifest: &RenderManifest,
    name_mapper: Rc<NameMapper>,
) -> anyhow::Result<NameMemo> {
    let mut renderer = TypeRenderer::new(
        name_mapper.nodes.clone(),
        Rc::new(fdk_ts::types::TypescriptTypeRenderer {}),
    );
    for &id in &manifest.arg_types {
        _ = renderer.render(id)?;
    }
    for &id in &manifest.return_types {
        _ = renderer.render(id)?;
    }
    let (types_ts, name_memo) = renderer.finalize();
    writeln!(dest.buf, "{}", types_ts)?;
    Ok(name_memo)
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
        Rc::new(selections::TsNodeSelectionsRenderer {
            arg_ty_names: arg_types_memo,
        }),
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
        Rc::new(node_metas::TsNodeMetasRenderer {
            name_mapper,
            named_types: named_types.clone(),
            input_files: manifest.input_files.clone(),
        }),
    );
    for &id in &manifest.node_metas {
        _ = renderer.render(id)?;
    }
    let (methods, memo) = renderer.finalize();
    write!(
        dest,
        r#"
const nodeMetas = {{
  scalar() {{
    return {{}};
  }},
  {methods}
}};
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

#[test]
fn e2e() -> anyhow::Result<()> {
    use crate::tests::*;

    let tg_name = "gen-test";
    let config = config::Config {
        targets: [(
            "default".to_string(),
            config::Target(
                [GeneratorConfig {
                    generator_name: "client_ts".to_string(),
                    other: serde_json::to_value(client_ts::ClienTsGenConfig {
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
                        let status = tokio::process::Command::new("deno")
                            .args("check client.ts".split(' ').collect::<Vec<_>>())
                            .current_dir(&args.path)
                            .kill_on_drop(true)
                            .spawn()?
                            .wait()
                            .await?;
                        if !status.success() {
                            anyhow::bail!("error checking generated crate");
                        }
                        let status = tokio::process::Command::new("deno")
                            .args("lint client.ts".split(' ').collect::<Vec<_>>())
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
                target_dir: Some("./fixtures/client_ts/".into()),
            }])
            .await
        })?;
    Ok(())
}
