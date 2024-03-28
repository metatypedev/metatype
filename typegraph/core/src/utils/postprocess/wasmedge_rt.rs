// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::wasmedge::WasiMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct WasmedgeProcessor;

impl PostProcessor for WasmedgeProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "wasi" {
                let mut mat_data: WasiMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let artifact_path = mat_data
                    .wasm_artifact
                    .path
                    .clone()
                    .to_string_lossy()
                    .to_string();
                let Some(path) = artifact_path.strip_prefix("file:").to_owned() else {
                    continue;
                };

                let wasi_path = fs_host::make_absolute(&PathBuf::from(path))?;

                let artifact_hash = fs_host::hash_file(&wasi_path.clone())?;

                let mut artifact = mat_data.wasm_artifact.clone();
                artifact.hash = artifact_hash;

                mat_data.wasm_artifact = artifact.clone();

                mat.data = map_from_object(mat_data.clone()).map_err(|e| e.to_string())?;

                tg.deps.push(wasi_path.clone());
                tg.meta.artifacts.push(artifact);
            }
        }
        Ok(())
    }
}
