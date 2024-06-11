// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use std::path::PathBuf;

use common::typegraph::runtimes::prisma::MigrationOptions;
use common::typegraph::runtimes::{KnownRuntime::Prisma, TGRuntime};
use common::typegraph::Typegraph;

use crate::utils::fs_host;
use crate::utils::postprocess::PostProcessor;
use crate::wit::core::MigrationAction;
use crate::wit::core::PrismaMigrationConfig;
use crate::wit::metatype::typegraph::host::path_exists;

pub struct PrismaProcessor {
    config: PrismaMigrationConfig,
}

impl PrismaProcessor {
    pub fn new(config: PrismaMigrationConfig) -> Self {
        Self { config }
    }
}

impl PostProcessor for PrismaProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        self.embed_prisma_migrations(tg)?;
        Ok(())
    }
}

impl PrismaProcessor {
    pub fn embed_prisma_migrations(&self, tg: &mut Typegraph) -> Result<(), String> {
        let base_migration_path = PathBuf::from(&self.config.migrations_dir);

        for rt in tg.runtimes.iter_mut() {
            if let TGRuntime::Known(Prisma(rt_data)) = rt {
                let rt_name = &rt_data.name;
                let path = base_migration_path.join(rt_name);
                let action = self.get_action_by_rt_name(rt_name);

                rt_data.migration_options = Some(MigrationOptions {
                    migration_files: {
                        if action.apply {
                            let path = fs_host::make_absolute(&path)?;
                            match path_exists(&path.display().to_string())? {
                                true => {
                                    let base64 = fs_host::compress_and_encode_base64(path)?;
                                    Some(base64)
                                }
                                false => None,
                            }
                        } else {
                            None
                        }
                    },
                    create: action.create,
                    reset: action.reset,
                });
            }
        }
        Ok(())
    }

    /// Find the appropriate migration action (usually set from the cli)
    /// If nothing is found, use the global action config (set initially)
    pub fn get_action_by_rt_name(&self, name: &str) -> MigrationAction {
        self.config
            .migration_actions
            .iter()
            .filter_map(|(rt, action)| if rt == name { Some(*action) } else { None })
            .last()
            .unwrap_or(self.config.default_migration_action)
    }
}
