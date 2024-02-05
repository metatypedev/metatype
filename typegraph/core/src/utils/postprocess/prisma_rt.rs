// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::Typegraph;

use crate::utils::postprocess::PostProcessor;
use crate::wit::core::MigrationConfig;

pub struct PrismaProcessor {
    #[allow(unused)]
    config: MigrationConfig,
}

impl PrismaProcessor {
    pub fn new(config: MigrationConfig) -> Self {
        Self { config }
    }
}

impl PostProcessor for PrismaProcessor {
    fn postprocess(self, _tg: &mut Typegraph) -> Result<(), String> {
        Ok(())
    }
}

// TODO:
// reset
// create
// +take basedir into account
