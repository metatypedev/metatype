// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::{artifacts::ArtifactsExt, fs::FsContext, postprocess::PostProcessor};
use common::typegraph::{
    runtimes::{self, TGRuntime},
    Typegraph,
};
use std::path::PathBuf;

pub struct SubstantialProcessor {
    typegraph_dir: PathBuf,
}

impl SubstantialProcessor {
    pub fn new(typegraph_dir: PathBuf) -> Self {
        Self { typegraph_dir }
    }
}

impl PostProcessor for SubstantialProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        let fs_ctx = FsContext::new(self.typegraph_dir.clone());
        let mut runtimes = std::mem::take(&mut tg.runtimes);

        for runtime in runtimes.iter_mut() {
            if let TGRuntime::Known(known_runtime) = runtime {
                match known_runtime {
                    runtimes::KnownRuntime::Substantial(data) => {
                        for wf_description in &mut data.workflows {
                            let entrypoint = wf_description.file.clone();
                            let deps = std::mem::take(&mut wf_description.deps);
                            wf_description.deps =
                                fs_ctx.register_artifacts(tg, entrypoint, deps)?;
                        }
                    }
                    _ => continue,
                }
            }
        }

        tg.runtimes = runtimes;
        Ok(())
    }
}
