// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use garde::external::compact_str::CompactStringExt;
use heck::ToPascalCase;

use crate::interlude::*;
use crate::mdk::*;
use crate::*;

use self::utils::Memo;
use self::utils::TypeGenerated;

mod types;
mod utils;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkPythonGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::MdkGeneratorConfigBase,
}

impl MdkPythonGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: mdk_python::MdkPythonGenConfig = serde_json::from_value(json)?;
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
    config: MdkPythonGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: MdkPythonGenConfig) -> Result<Self, garde::Report> {
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
        let mut mergeable_output: IndexMap<PathBuf, Vec<RequiredObjects>> = IndexMap::new();

        let mut tera = tera::Tera::default();
        tera.add_raw_template("main_template", include_str!("static/main.py.jinja"))?;
        tera.add_raw_template("types_template", include_str!("static/types.py.jinja"))?;
        tera.add_raw_template("struct_template", include_str!("static/struct.py.jinja"))?;

        let stubbed_funs = filter_stubbed_funcs(tg, &["python".to_string()])?;
        for fun in &stubbed_funs {
            if fun.mat.data.get("mod").is_none() {
                continue;
            }
            let (_, script_path) = get_module_infos(fun, tg)?;
            let base_path = self.config.base.path.clone();
            let entry_point_path = if base_path.as_os_str().to_string_lossy().trim() == "" {
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
                base_path.join(&script_path)
            };

            let required = gen_required_objects(&tera, fun, tg)?;
            mergeable_output
                .entry(entry_point_path.clone())
                .or_default()
                .push(required);
        }

        let merged_list = merge_requirements(mergeable_output);
        let mut out = HashMap::new();
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
                    contents: render_main(&tera, &merged_req, file_stem)?,
                    overwrite: false,
                },
            );
            out.insert(
                types_path,
                GeneratedFile {
                    contents: render_types(&tera, &merged_req)?,
                    overwrite: true,
                },
            );
        }

        Ok(GeneratorOutput(out))
    }
}

fn get_module_infos(fun: &StubbedFunction, tg: &Typegraph) -> anyhow::Result<(String, PathBuf)> {
    let idx = serde_json::from_value::<usize>(
        fun.mat
            .data
            .get("mod")
            .with_context(|| "python mod index")
            .unwrap()
            .clone(),
    )?;
    let mod_name = serde_json::from_value::<String>(
        fun.mat
            .data
            .get("name")
            .with_context(|| "python mod name")
            .unwrap()
            .clone(),
    )?;
    let script_path = serde_json::from_value::<String>(
        tg.materializers[idx].data["pythonArtifact"]["path"].clone(),
    )?;
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
    let mut exports = HashSet::new();
    for func in required.funcs.iter() {
        exports.insert(format!("typed_{}", func.name));
        exports.insert(func.input_name.clone());
        exports.insert(func.output_name.clone());
    }

    let mut context = tera::Context::new();
    context.insert("funcs", &required.funcs);
    context.insert("mod_name", file_stem);
    context.insert("imports", &exports.join_compact(", ").to_string());

    tera.render("main_template", &context)
        .wrap_err("Failed to render main template")
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

    tera.render("types_template", &context)
        .context("Failed to render types template")
}

fn gen_required_objects(
    tera: &tera::Tera,
    fun: &StubbedFunction,
    tg: &Typegraph,
) -> anyhow::Result<RequiredObjects> {
    if let TypeNode::Function { data, .. } = fun.node.clone() {
        let mut memo = Memo::new();
        let input = tg.types[data.input as usize].clone();
        let output = tg.types[data.output as usize].clone();

        let input_name = input.base().title.to_pascal_case();
        let output_name = output.base().title.to_pascal_case();

        let _input_hint = types::visit_type(tera, &mut memo, &input, tg)?.hint;
        let output_hint = types::visit_type(tera, &mut memo, &output, tg)?.hint;

        let (fn_name, _) = get_module_infos(fun, tg)?;
        match output {
            TypeNode::Object { .. } => {
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
    } else {
        panic!("function node was expected")
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
        let mut types = HashSet::new();
        let mut funcs = HashSet::new();

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
