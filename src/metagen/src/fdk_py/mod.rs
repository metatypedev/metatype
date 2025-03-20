// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO: keyword filtering

use garde::external::compact_str::CompactStringExt;
use heck::ToPascalCase;
use indexmap::IndexSet;
use typegraph::{FunctionType, TypeNode as _};

use crate::interlude::*;
use crate::shared::*;
use crate::*;

use self::utils::Memo;
use self::utils::TypeGenerated;

mod types;
mod utils;

pub const MAIN_TEMPLATE: &str = "main.py.jinja";
pub const TYPES_TEMPLATE: &str = "types.py.jinja";
pub const STRUCT_TEMPLATE: &str = "struct.py.jinja";

pub const DEFAULT_TEMPLATE: &[(&str, &str)] = &[
    (MAIN_TEMPLATE, include_str!("static/main.py.jinja")),
    (TYPES_TEMPLATE, include_str!("static/types.py.jinja")),
    (STRUCT_TEMPLATE, include_str!("static/struct.py.jinja")),
];

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct FdkPythonGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
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

    pub fn new(config: FdkPythonGenConfig) -> anyhow::Result<Self> {
        use garde::Validate;
        config.validate().context("validating FDK_PY config")?;
        Ok(Self { config })
    }
}

impl TryFrom<FdkTemplate> for tera::Tera {
    type Error = anyhow::Error;

    fn try_from(template: FdkTemplate) -> Result<Self, Self::Error> {
        let mut tera = Self::default();
        for (file_name, content) in template.entries {
            tera.add_raw_template(file_name, &content)?;
        }
        Ok(tera)
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
        // return Ok(GeneratorOutput(Default::default()))
        let tg = match inputs
            .swap_remove(Self::INPUT_TG)
            .context("missing generator input")?
        {
            GeneratorInputResolved::TypegraphFromTypegate { raw } => raw,
            GeneratorInputResolved::TypegraphFromPath { raw } => raw,
            _ => unreachable!(),
        };

        let template: tera::Tera = match inputs.swap_remove("template_dir").unwrap() {
            GeneratorInputResolved::FdkTemplate { template } => template.try_into()?,
            _ => unreachable!(),
        };

        let mut mergeable_output: IndexMap<PathBuf, Vec<RequiredObjects>> = IndexMap::new();

        let stubbed_funs = filter_stubbed_funcs(&tg, &["python".to_string()])
            .wrap_err("error collecting materializers for \"python\" runtime")?;
        for fun in &stubbed_funs {
            if fun.materializer.data.get("mod").is_none() {
                continue;
            }
            let (_, script_path) = get_module_infos(fun, &tg)?;
            let target_path = self.config.base.path.clone();
            let entry_point_path = if target_path.as_os_str().to_string_lossy().trim() == "" {
                self.config
                    .base
                    .typegraph_path
                    .clone()
                    .map(|p| p.parent().unwrap().to_owned()) // try relto typegraph path first
                    .unwrap()
                    .join(script_path)
            } else if script_path.is_absolute() {
                script_path
            } else {
                target_path.join(
                    script_path
                        .file_name()
                        .expect("invalid script path set for python runtime"),
                )
            };

            let required = gen_required_objects(&template, fun, &tg)?;
            mergeable_output
                .entry(entry_point_path.clone())
                .or_default()
                .push(required);
        }

        let merged_list = merge_requirements(mergeable_output);
        let mut out = IndexMap::new();
        for merged_req in merged_list {
            let entry_point_path = merged_req.entry_point_path.clone();
            let file_stem = merged_req
                .entry_point_path
                .file_stem()
                .map(|v| v.to_str().to_owned())
                .unwrap()
                .with_context(|| "Get file stem")
                .unwrap();
            let types_path = merged_req
                .entry_point_path
                .parent()
                .with_context(|| "Get parent path")
                .unwrap()
                .join(PathBuf::from(format!("{file_stem}_types.py")));

            out.insert(
                entry_point_path,
                GeneratedFile {
                    contents: render_main(&template, &merged_req, file_stem)?,
                    overwrite: false,
                },
            );
            out.insert(
                types_path,
                GeneratedFile {
                    contents: render_types(&template, &merged_req)?,
                    overwrite: true,
                },
            );
        }

        Ok(GeneratorOutput(out))
    }
}

fn get_module_infos(fun: &Arc<FunctionType>, tg: &Typegraph) -> anyhow::Result<(String, PathBuf)> {
    let idx = serde_json::from_value::<usize>(
        fun.materializer
            .data
            .get("mod")
            .with_context(|| "python mod index")
            .unwrap()
            .clone(),
    )?;
    let mod_name = serde_json::from_value::<String>(
        fun.materializer
            .data
            .get("name")
            .with_context(|| "python mod name")
            .unwrap()
            .clone(),
    )?;
    let script_path =
        serde_json::from_value::<String>(tg.materializers[idx].data["entryPoint"].clone())?;
    let script_path = PathBuf::from(script_path.clone());

    Ok((mod_name, script_path))
}

#[derive(Serialize, Eq, PartialEq, Hash)]
struct FuncDetails {
    pub input_name: String,
    pub output_name: String,
    pub name: String,
}

/// Objects required per function
struct RequiredObjects {
    pub func_details: FuncDetails,
    pub top_level_types: Vec<TypeGenerated>,
    pub memo: Memo,
}

/// Objects required per function that refers to the same python module
struct MergedRequiredObjects {
    pub funcs: Vec<FuncDetails>,
    pub top_level_types: Vec<TypeGenerated>,
    pub memo: Memo,
    pub entry_point_path: PathBuf,
}

fn render_main(
    tera: &tera::Tera,
    required: &MergedRequiredObjects,
    file_stem: &str,
) -> anyhow::Result<String> {
    let mut exports = std::collections::BTreeSet::new();
    for func in required.funcs.iter() {
        exports.insert(format!("typed_{}", func.name));
        exports.insert(func.input_name.clone());
        exports.insert(func.output_name.clone());
    }

    let mut context = tera::Context::new();
    context.insert("funcs", &required.funcs);
    context.insert("mod_name", file_stem);
    context.insert("imports", &exports.join_compact(", ").to_string());

    tera.render(MAIN_TEMPLATE, &context)
        .with_context(|| "Failed to render main template")
}

fn render_types(tera: &tera::Tera, required: &MergedRequiredObjects) -> anyhow::Result<String> {
    let mut context = tera::Context::new();
    let classes = required
        .memo
        .types_in_order()
        .iter()
        .filter_map(|gen| {
            if gen.def.is_some() {
                Some(serde_json::to_value(gen.to_owned()).unwrap())
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    let types = required
        .top_level_types
        .iter()
        .filter_map(|gen| gen.def.clone())
        .collect::<Vec<_>>();

    context.insert("classes", &classes);
    context.insert("types", &types);
    context.insert("funcs", &required.funcs);

    tera.render(TYPES_TEMPLATE, &context)
        .with_context(|| "Failed to render types template")
}

fn gen_required_objects(
    tera: &tera::Tera,
    fun: &Arc<FunctionType>,
    tg: &Typegraph,
) -> anyhow::Result<RequiredObjects> {
    let mut memo = Memo::new();
    let input = fun.input();
    let output = fun.output();

    let input_name = input.base().title.to_pascal_case();
    let output_name = output.base().title.to_pascal_case();

    let _input_hint = types::visit_type(tera, &mut memo, &Type::Object(input.clone()), tg)?.hint;
    let output_hint = types::visit_type(tera, &mut memo, &output, tg)?.hint;

    let (fn_name, _) = get_module_infos(fun, tg)?;
    match output {
        Type::Object(_) => {
            // output is a top level dataclass
            Ok(RequiredObjects {
                func_details: FuncDetails {
                    input_name,
                    output_name,
                    name: fn_name,
                },
                top_level_types: vec![],
                memo,
            })
        }
        _ => {
            // output is a top level inline def
            let output_name = format!("Type{output_name}");
            let def = format!("{} = {}", output_name.clone(), output_hint);
            let top_level_types = vec![TypeGenerated {
                hint: output_hint,
                def: Some(def),
            }];
            Ok(RequiredObjects {
                func_details: FuncDetails {
                    input_name,
                    output_name,
                    name: fn_name,
                },
                top_level_types,
                memo,
            })
        }
    }
}

fn merge_requirements(
    mergeable: IndexMap<PathBuf, Vec<RequiredObjects>>,
) -> Vec<MergedRequiredObjects> {
    // merge types and defs that refers the same file
    let mut gen_inputs = vec![];
    for (entry_point_path, requirements) in mergeable {
        let mut ongoing_merge = MergedRequiredObjects {
            entry_point_path,
            funcs: vec![],
            memo: Memo::new(),
            top_level_types: vec![],
        };
        let mut types = IndexSet::new();
        let mut funcs = IndexSet::new();

        for req in requirements {
            // merge classes
            ongoing_merge.memo.merge_with(req.memo.clone());
            // merge types
            for tpe in req.top_level_types {
                types.insert(tpe);
            }
            // merge funcs
            funcs.insert(req.func_details);
        }

        ongoing_merge.top_level_types = Vec::from_iter(types.into_iter());
        ongoing_merge.funcs = Vec::from_iter(funcs.into_iter());
        gen_inputs.push(ongoing_merge);
    }

    gen_inputs
}
