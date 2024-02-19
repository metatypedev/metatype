// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{global_store::Store, utils::fs_host, wit::core::ArtifactResolutionConfig};
use common::typegraph::Typegraph;
use std::path::Path;

pub mod deno_rt;
pub mod prisma_rt;
pub mod python_rt;
pub mod wasmedge_rt;

use self::deno_rt::DenoProcessor;
use self::prisma_rt::PrismaProcessor;
use self::python_rt::PythonProcessor;
use self::wasmedge_rt::WasmedgeProcessor;

pub trait PostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String>;
}

/// Compose all postprocessors
pub struct TypegraphPostProcessor {
    config: ArtifactResolutionConfig,
}

impl TypegraphPostProcessor {
    pub fn new(config: ArtifactResolutionConfig) -> Self {
        Self { config }
    }
}

impl PostProcessor for TypegraphPostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String> {
        Store::set_deploy_cwd(self.config.dir);
        PrismaProcessor::new(self.config.prisma_migration).postprocess(tg)?;
        DenoProcessor.postprocess(tg)?;
        PythonProcessor.postprocess(tg)?;
        WasmedgeProcessor.postprocess(tg)?;
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
