// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{global_store::Store, utils::fs_host, wit::core::ArtifactResolutionConfig};
use common::typegraph::Typegraph;
use std::path::Path;

pub mod deno_rt;
pub mod prisma_rt;
pub mod python_rt;
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
    config: Option<ArtifactResolutionConfig>,
}

impl TypegraphPostProcessor {
    pub fn new(config: Option<ArtifactResolutionConfig>) -> Self {
        Self { config }
    }
}

impl PostProcessor for TypegraphPostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), TgError> {
        if let Some(config) = self.config {
            Store::set_deploy_cwd(config.dir); // fs_host::cwd() will now use this value
            PrismaProcessor::new(config.prisma_migration).postprocess(tg)?;

            // Artifact resolution depends on the default cwd() (parent process)
            // unless overwritten by `dir` through Store::set_deploy_cwd(..) (cli or custom dir with tgDeploy)
            let allow_fs_read_artifacts = !config.disable_artifact_resolution.unwrap_or(false);
            if allow_fs_read_artifacts {
                DenoProcessor.postprocess(tg)?;
                PythonProcessor.postprocess(tg)?;
                WasmProcessor.postprocess(tg)?;
            }
        }

        ValidationProcessor.postprocess(tg)?;
        Ok(())
    }
}

pub fn compress_and_encode(main_path: &Path) -> Result<String, String> {
    if let Err(e) = fs_host::read_text_file(main_path.display().to_string()) {
        return Err(format!("Unable to read {:?}: {}", main_path.display(), e));
    }

    let enc_content = fs_host::compress_and_encode_base64(fs_host::cwd()?)?;
    Ok(format!(
        "file:{};base64:{}",
        fs_host::make_relative(main_path)?.display(),
        enc_content
    ))
}
