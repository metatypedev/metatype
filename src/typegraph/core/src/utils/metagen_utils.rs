// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{borrow::Cow, sync::Arc};

use super::fs::FsContext;
use color_eyre::Result;
use metagen::{GeneratorInputOrder, GeneratorInputResolved, InputResolverSync};
use tg_schema::Typegraph;

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
                    raw: Arc::new(Arc::new(self.tg.clone()).try_into()?),
                })
            }
            GeneratorInputOrder::TypegraphFromPath { .. } => unimplemented!(),
            GeneratorInputOrder::LoadFdkTemplate {
                default,
                override_path,
            } => Ok(GeneratorInputResolved::FdkTemplate {
                template: self.load_fdk_template(default, override_path.as_deref())?,
            }),
        }
    }
}

impl RawTgResolver {
    fn load_fdk_template(
        &self,
        default: &[(&'static str, &'static str)],
        template_dir: Option<&std::path::Path>,
    ) -> Result<metagen::FdkTemplate> {
        let mut entries = indexmap::IndexMap::default();
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
        Ok(metagen::FdkTemplate { entries })
    }
}
