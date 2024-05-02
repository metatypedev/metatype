// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use crate::mdk::*;
use crate::*;

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
        out.insert(
            self.config.base.path.join("sample.py"),
            gen_mod_py(&self.config, tg)?,
        );
        Ok(GeneratorOutput(out))
    }
}

// TODO: rm config?
fn gen_mod_py(_config: &MdkPythonGenConfig, tg: &Typegraph) -> anyhow::Result<String> {
    let stubbed_funs = filter_stubbed_funcs(tg, &["pymodule".to_string()])?;
    for fun in &stubbed_funs {
        println!("Stub {:?}", fun.mat);
    }
    Ok("def sample():\n\tpass".to_string())
}
