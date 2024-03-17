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
        let tg_name = tg.name().unwrap();
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "wasi" {
                let mut mat_data: WasiMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let Some(path) = mat_data.wasm.strip_prefix("file:").to_owned() else {
                    continue;
                };

                let wasi_path = fs_host::make_absolute(&PathBuf::from(path))?;
                let file_name = path.split('/').last().unwrap();
                let artifact_hash = mat_data.artifact_hash.clone();
                let wasm_path = format!(
                    "tmp/metatype-artifacts/{}/files/{}.{}",
                    tg_name, file_name, artifact_hash
                );

                mat_data.wasm = wasm_path;

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(wasi_path);
            }
        }
        Ok(())
    }
}
