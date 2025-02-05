// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use crate::utils::{artifacts::ArtifactsExt, fs::FsContext};
use common::typegraph::{
    runtimes::{KnownRuntime, TGRuntime},
    Typegraph,
};

use crate::utils::postprocess::PostProcessor;

pub struct WasmProcessor {
    typegraph_dir: PathBuf,
}

impl WasmProcessor {
    pub fn new(typegraph_dir: PathBuf) -> Self {
        Self { typegraph_dir }
    }
}

impl PostProcessor for WasmProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        let fs_ctx = FsContext::new(self.typegraph_dir);
        let runtimes = std::mem::take(&mut tg.runtimes);
        for rt in runtimes.iter() {
            let data = match rt {
                TGRuntime::Known(KnownRuntime::WasmReflected(data))
                | TGRuntime::Known(KnownRuntime::WasmWire(data)) => data,
                _ => {
                    continue;
                }
            };

            fs_ctx.register_artifacts(tg, data.wasm_artifact.clone(), vec![])?;
        }

        tg.runtimes = runtimes;
        Ok(())
    }
}
