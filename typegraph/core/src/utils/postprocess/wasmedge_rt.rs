// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::{
    archive::encode_bytes_to_base_64,
    typegraph::{
        runtimes::wasmedge::WasiMatData,
        utils::{map_from_object, object_from_map},
        Typegraph,
    },
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct WasmedgeProcessor;

impl PostProcessor for WasmedgeProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "wasi" {
                let mut mat_data: WasiMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let Some(path) = mat_data.wasm.strip_prefix("file:").to_owned() else {
                    continue;
                };

                let wasi_path = fs_host::make_absolute(&PathBuf::from(path))?;
                let bytes = crate::wit::read_file(&wasi_path.display().to_string())?;
                mat_data.wasm = encode_bytes_to_base_64(bytes).map_err(|e| e.to_string())?;

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(wasi_path);
            }
        }
        Ok(())
    }
}
