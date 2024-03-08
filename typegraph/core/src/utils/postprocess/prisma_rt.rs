// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use std::path::PathBuf;

use common::typegraph::runtimes::prisma::MigrationOptions;
use common::typegraph::runtimes::{KnownRuntime::Prisma, TGRuntime};
use common::typegraph::Typegraph;

use crate::utils::fs_host;
use crate::utils::postprocess::PostProcessor;
use crate::wit::core::MigrationConfig;
use crate::wit::metatype::typegraph::host::path_exists;

pub struct PrismaProcessor {
    config: MigrationConfig,
}

impl PrismaProcessor {
    pub fn new(config: MigrationConfig) -> Self {
        Self { config }
    }
}

impl PostProcessor for PrismaProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String> {
        self.embed_prisma_migrations(tg)?;
        Ok(())
    }
}

impl PrismaProcessor {
    pub fn embed_prisma_migrations(&self, tg: &mut Typegraph) -> Result<(), String> {
        let base_migration_path = self.prisma_migrations_dir()?;

        for rt in tg.runtimes.iter_mut() {
            if let TGRuntime::Known(Prisma(rt_data)) = rt {
                let rt_name = &rt_data.name;
                let path = base_migration_path.join(rt_name);

                rt_data.migration_options = Some(MigrationOptions {
                    migration_files: {
                        let path = fs_host::make_absolute(&path)?;
                        match path_exists(&path.display().to_string())? {
                            true => {
                                let base64 = fs_host::compress_and_encode_base64(path)?;
                                Some(base64)
                            }
                            false => None,
                        }
                    },
                    create: self.config.action.create,
                    reset: self.config.action.reset,
                });
            }
        }
        Ok(())
    }

    /// Simply concat `cwd` with `migration-path` (provided manually or set by the cli)
    pub fn prisma_migrations_dir(&self) -> Result<PathBuf, String> {
        let migration_dir = self.config.migration_dir.clone();
        let path = fs_host::cwd()?.join(PathBuf::from(migration_dir));
        Ok(path)
    }
}
