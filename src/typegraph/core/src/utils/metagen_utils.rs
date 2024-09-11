// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, collections::HashMap};

use super::fs::FsContext;
use color_eyre::Result;
use common::typegraph::Typegraph;
use metagen::{GeneratorInputOrder, GeneratorInputResolved, InputResolverSync};

#[derive(Clone)]
pub struct RawTgResolver {
    pub tg: Typegraph,
    pub fs: FsContext,
}

impl InputResolverSync for RawTgResolver {
    fn resolve(&self, order: metagen::GeneratorInputOrder) -> Result<GeneratorInputResolved> {
        match order {
            GeneratorInputOrder::TypegraphFromTypegate { .. } => {
                Ok(GeneratorInputResolved::TypegraphFromTypegate {
                    raw: self.tg.clone().into(),
                })
            }
            GeneratorInputOrder::TypegraphFromPath { .. } => unimplemented!(),
            GeneratorInputOrder::LoadMdkTemplate {
                default,
                override_path,
            } => Ok(GeneratorInputResolved::MdkTemplate {
                template: self.load_mdk_template(default, override_path.as_deref())?,
            }),
        }
    }
}

impl RawTgResolver {
    fn load_mdk_template(
        &self,
        default: &[(&'static str, &'static str)],
        template_dir: Option<&std::path::Path>,
    ) -> Result<metagen::MdkTemplate> {
        let mut entries = HashMap::new();
        for (file_name, default_content) in default.iter() {
            let content = if let Some(override_path) = template_dir {
                let path = override_path.join(file_name);
                if self.fs.exists(&path)? {
                    Cow::Owned(self.fs.read_text_file(&path)?)
                } else {
                    Cow::Borrowed(*default_content)
                }
            } else {
                Cow::Borrowed(*default_content)
            };
            entries.insert(*file_name, content);
        }
        Ok(metagen::MdkTemplate { entries })
    }
}
