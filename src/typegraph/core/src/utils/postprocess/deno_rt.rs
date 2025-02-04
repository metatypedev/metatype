// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use common::typegraph::runtimes::deno::ModuleMatData;
use common::typegraph::utils::map_from_object;
use common::typegraph::{utils::object_from_map, Typegraph};
use std::path::PathBuf;

use crate::utils::{artifacts::ArtifactsExt, fs::FsContext, postprocess::PostProcessor};

pub struct DenoProcessor {
    typegraph_dir: PathBuf,
}

impl DenoProcessor {
    pub fn new(typegraph_dir: PathBuf) -> Self {
        Self { typegraph_dir }
    }
}

impl PostProcessor for DenoProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        let fs_ctx = FsContext::new(self.typegraph_dir);
        let mut materializers = std::mem::take(&mut tg.materializers);
        for mat in materializers.iter_mut() {
            if mat.name.as_str() == "module" {
                let mat_data = std::mem::take(&mut mat.data);
                let mut mat_data: ModuleMatData =
                    object_from_map(mat_data).map_err(|e| e.to_string())?;

                fs_ctx.register_artifact(mat_data.entry_point.clone(), tg)?;

                // TODO shared logic for artifact registration
                let deps = std::mem::take(&mut mat_data.deps);
                for artifact in deps.into_iter() {
                    let artifacts = fs_ctx.list_files(&[artifact.to_string_lossy().to_string()]);
                    if artifacts.is_empty() {
                        return Err(format!(
                            "no artifacts found for dependency '{}'",
                            artifact.to_string_lossy()
                        )
                        .into());
                    }
                    for artifact in artifacts.iter() {
                        fs_ctx.register_artifact(artifact.clone(), tg)?;
                    }
                    mat_data.deps.extend(artifacts);
                }

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
            }
        }

        tg.materializers = materializers;
        Ok(())
    }
}
