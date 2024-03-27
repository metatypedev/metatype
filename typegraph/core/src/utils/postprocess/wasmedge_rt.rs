// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::wasmedge::WasiMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};
use std::path::{Path, PathBuf};

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
                let file_name = Path::new(path).file_name().unwrap().to_str().unwrap();
                let artifact_hash = mat_data.artifact_hash.clone();

                mat_data.wasm = file_name.into();
                mat_data.artifact_hash = artifact_hash;
                mat_data.tg_name = Some(tg_name.clone());

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(wasi_path);
            }
        }
        Ok(())
    }
}
