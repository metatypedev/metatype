// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::bail;
use heck::ToPascalCase;

use crate::interlude::*;
use crate::mdk::*;
use crate::*;

use self::utils::Memo;

mod types;
mod utils;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct MdkPythonGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::MdkGeneratorConfigBase,
}

pub struct PythonGenerator {
    config: MdkPythonGenConfig,
}

impl PythonGenerator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: MdkPythonGenConfig) -> Result<Self, garde::Report> {
        use garde::Validate;
        config.validate(&())?;
        Ok(Self { config })
    }
}

impl crate::Plugin for PythonGenerator {
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

        let stubbed_funs = filter_stubbed_funcs(tg, &["python_wasi".to_string()])?;
        for fun in &stubbed_funs {
            let (mod_name, script_path) = get_module_infos(fun, &tg)?;
            if let Some(file_stem) = script_path.file_stem().map(|v| v.to_str()).unwrap() {
                let parent = script_path
                    .parent()
                    .context("extract file parent folder")
                    .unwrap();
                let base = match script_path.is_relative() {
                    true => self.config.base.path.join(parent),
                    false => parent.to_path_buf(),
                };

                let required = gen_required_objects(&tera, fun, tg)?;
                out.insert(
                    base.join(format!("{file_stem}_types.py")),
                    render_types(&tera, &required)?,
                );
                out.insert(
                    base.join(format!("{file_stem}.py")),
                    render_main(&tera, &required, &mod_name, &file_stem)?,
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
    pub input_key: String,
    pub output_key: String,
    pub memo: Memo,
}

fn render_main(
    tera: &tera::Tera,
    required: &RequiredObjects,
    mod_name: &str,
    file_stem: &str,
) -> anyhow::Result<String> {
    let mut context = tera::Context::new();
    context.insert("t_input", &required.input_key);
    context.insert("t_output", &required.output_key);
    context.insert("fn_name", mod_name);
    context.insert("type_mod_name", file_stem);
    tera.render("main_template", &context).map_err(|e| e.into())
}

fn render_types(tera: &tera::Tera, required: &RequiredObjects) -> anyhow::Result<String> {
    let mut context = tera::Context::new();
    let types = required
        .memo
        .types_in_order()
        .iter()
        .map(|repr| repr.def.to_owned())
        .collect::<Vec<_>>();
    context.insert("types", &types);
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
        types::visit_type(tera, &mut memo, &input, tg)?;
        types::visit_type(tera, &mut memo, &output, tg)?;
        Ok(RequiredObjects {
            input_key: input.base().title.to_pascal_case(),
            output_key: output.base().title.to_pascal_case(),
            memo,
        })
    } else {
        bail!("function node was expected")
    }
}
