// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::{artifacts::ArtifactsExt, fs::FsContext, postprocess::PostProcessor};
use common::typegraph::{
    runtimes::python::ModuleMatData,
    utils::{map_from_object, object_from_map},
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
        let mut materializers = std::mem::take(&mut tg.materializers);
        let has_workflow_def = &["start", "stop", "send"];
        for mat in materializers.iter_mut() {
            if has_workflow_def.contains(&mat.name.as_str()) {
                let mat_data = std::mem::take(&mut mat.data);
                let mut mat_data: ModuleMatData =
                    object_from_map(mat_data).map_err(|e| e.to_string())?;

                fs_ctx.register_artifact(mat_data.entry_point.clone(), tg)?;

                let deps = std::mem::take(&mut mat_data.deps);
                for artifact in deps.into_iter() {
                    let artifacts = fs_ctx.list_files(&[artifact.to_string_lossy().to_string()]);
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
