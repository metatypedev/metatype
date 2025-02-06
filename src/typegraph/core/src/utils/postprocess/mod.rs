// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::SerializeParams;
use std::path::PathBuf;
use substantial_rt::SubstantialProcessor;
use tg_schema::Typegraph;

pub mod deno_rt;
pub mod naming;
pub mod prisma_rt;
pub mod python_rt;
pub mod substantial_rt;
pub mod validation;
pub mod wasm_rt;

use self::deno_rt::DenoProcessor;
use self::prisma_rt::PrismaProcessor;
use self::python_rt::PythonProcessor;
use self::validation::ValidationProcessor;
use self::wasm_rt::WasmProcessor;
use crate::errors::TgError;

pub trait PostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), TgError>;
}

/// Compose all postprocessors
pub struct TypegraphPostProcessor {
    config: SerializeParams,
}

impl TypegraphPostProcessor {
    pub fn new(config: SerializeParams) -> Self {
        Self { config }
    }
}

impl PostProcessor for TypegraphPostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), TgError> {
        let config = self.config;
        let typegraph_dir = PathBuf::from(config.typegraph_path)
            .parent()
            .unwrap()
            .to_owned();

        PrismaProcessor::new(config.prisma_migration.clone()).postprocess(tg)?;

        let allow_fs_read_artifacts = config.artifact_resolution;
        if allow_fs_read_artifacts {
            DenoProcessor::new(typegraph_dir.clone()).postprocess(tg)?;
            PythonProcessor::new(typegraph_dir.clone()).postprocess(tg)?;
            WasmProcessor::new(typegraph_dir.clone()).postprocess(tg)?;
            SubstantialProcessor::new(typegraph_dir.clone()).postprocess(tg)?;
        }

        ValidationProcessor.postprocess(tg)?;
        Ok(())
    }
}
