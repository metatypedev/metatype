// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::bail;
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
        let mut out = HashMap::new();

        let mut tera = tera::Tera::default();
        tera.add_raw_template("main_template", include_str!("static/main.py.jinja"))?;
        tera.add_raw_template("types_template", include_str!("static/types.py.jinja"))?;
        tera.add_raw_template("struct_template", include_str!("static/struct.py.jinja"))?;

        let stubbed_funs = filter_stubbed_funcs(tg, &["python".to_string()])?;
        for fun in &stubbed_funs {
            let (mod_name, script_path) = get_module_infos(fun, tg)?;
            if let Some(file_stem) = script_path.file_stem().map(|v| v.to_str()).unwrap() {
                let parent = script_path
                    .parent()
                    .context("extract file parent folder")
                    .unwrap();
                let base = match script_path.is_relative() || script_path.as_os_str().eq("") {
                    true => self
                        .config
                        .base
                        .typegraph_path
                        .clone()
                        .map(|p| p.parent().unwrap().to_owned()) // try relto typegraph path first
                        .unwrap_or(self.config.base.path.clone()) // or pick 'path' in config
                        .join(parent),
                    false => parent.to_path_buf(),
                };

                let required = gen_required_objects(&tera, fun, tg)?;
                out.insert(
                    base.join(format!("{file_stem}_types.py")),
                    GeneratedFile {
                        contents: render_types(&tera, &required)?,
                        overwrite: true,
                    },
                );
                out.insert(
                    base.join(format!("{file_stem}.py")),
                    GeneratedFile {
                        contents: render_main(&tera, &required, &mod_name, file_stem)?,
                        overwrite: false,
                    },
                );
            } else {
                bail!("{} is not a valid file path", script_path.display())
            }
        }

        Ok(GeneratorOutput(out))
    }
}

fn get_module_infos(fun: &StubbedFunction, tg: &Typegraph) -> anyhow::Result<(String, PathBuf)> {
    let idx = serde_json::from_value::<usize>(
        fun.mat
            .data
            .get("mod")
            .context("python mod index")
            .unwrap()
            .clone(),
    )?;
    let mod_name = serde_json::from_value::<String>(
        fun.mat
            .data
            .get("name")
            .context("python mod name")
            .unwrap()
            .clone(),
    )?;
    let script_path = serde_json::from_value::<String>(
        tg.materializers[idx].data["pythonArtifact"]["path"].clone(),
    )?;
    let script_path = PathBuf::from(script_path.clone());

    Ok((mod_name, script_path))
}

struct RequiredObjects {
    pub input_name: String,
    pub output_name: String,
    pub top_level_types: Vec<TypeGenerated>,
    pub memo: Memo,
}

fn render_main(
    tera: &tera::Tera,
    required: &RequiredObjects,
    mod_name: &str,
    file_stem: &str,
) -> anyhow::Result<String> {
    let mut context = tera::Context::new();
    context.insert("t_input", &required.input_name);
    context.insert("t_output", &required.output_name);
    context.insert("fn_name", mod_name);
    context.insert("type_mod_name", file_stem);
    tera.render("main_template", &context).map_err(|e| e.into())
}

fn render_types(tera: &tera::Tera, required: &RequiredObjects) -> anyhow::Result<String> {
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
    context.insert("t_input", &required.input_name);
    context.insert("t_output", &required.output_name);

    tera.render("types_template", &context)
        .map_err(|e| e.into())
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

        match output {
            TypeNode::Object { .. } => {
                // output is a top level dataclass
                Ok(RequiredObjects {
                    input_name,
                    output_name,
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
                    input_name,
                    output_name,
                    top_level_types,
                    memo,
                })
            }
        }
    } else {
        bail!("function node was expected")
    }
}
