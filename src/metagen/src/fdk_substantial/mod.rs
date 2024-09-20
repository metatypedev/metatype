// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO: keyword filtering

use crate::interlude::*;
use crate::*;

#[derive(Serialize, Deserialize, Debug, garde::Validate)]
pub struct FdkSubstantialGenConfig {
    #[serde(flatten)]
    #[garde(dive)]
    pub base: crate::config::FdkGeneratorConfigBase,
}

impl FdkSubstantialGenConfig {
    pub fn from_json(json: serde_json::Value, workspace_path: &Path) -> anyhow::Result<Self> {
        let mut config: FdkSubstantialGenConfig = serde_json::from_value(json)?;
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
    config: FdkSubstantialGenConfig,
}

impl Generator {
    pub const INPUT_TG: &'static str = "tg_name";
    pub fn new(config: FdkSubstantialGenConfig) -> Result<Self, garde::Report> {
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
        // TODO: enable additionnal parameters for metagen
        // For example: meta gen --params workflow-name=hello_world
        _: HashMap<String, GeneratorInputResolved>,
    ) -> anyhow::Result<GeneratorOutput> {
        let mut files = HashMap::new();
        let base = self.config.base.path.clone();
        files.insert(
            base.join("substantial.py"),
            GeneratedFile {
                contents: include_str!("static/substantial.py").to_owned(),
                overwrite: true,
            },
        );
        files.insert(
            base.join("types.py"),
            GeneratedFile {
                contents: include_str!("static/types.py").to_owned(),
                overwrite: true,
            },
        );
        files.insert(
            base.join("workflow.py"),
            GeneratedFile {
                contents: include_str!("static/workflow.py").to_owned(),
                overwrite: false,
            },
        );

        Ok(GeneratorOutput(files))
    }
}
