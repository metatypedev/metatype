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
        let runtimes = std::mem::take(&mut tg.runtimes);

        for runtime in runtimes.iter() {
            if let TGRuntime::Known(known_runtime) = runtime {
                match known_runtime {
                    runtimes::KnownRuntime::Substantial(data) => {
                        for wf_description in &data.workflows {
                            fs_ctx.register_artifact(wf_description.file.clone(), tg)?;

                            for artifact in &wf_description.deps {
                                let artifacts: Vec<PathBuf> =
                                    fs_ctx.list_files(&[artifact.to_string_lossy().to_string()]);
                                for artifact in artifacts.iter() {
                                    fs_ctx.register_artifact(artifact.clone(), tg)?;
                                }
                            }
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
