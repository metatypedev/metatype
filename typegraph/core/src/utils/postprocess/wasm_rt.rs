// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::wasm::WasmMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct WasmProcessor;

impl PostProcessor for WasmProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        let tg_name = tg.name().unwrap();
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "wasm" {
                let mut mat_data: WasmMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let Some(path) = mat_data.wasm.strip_prefix("file:").to_owned() else {
                    continue;
                };

                let wasm_path = fs_host::make_absolute(&PathBuf::from(path))?;
                let file_name = path.split('/').last().unwrap();

                let artifact_hash = fs_host::hash_file(&wasm_path.clone())?;

                mat_data.wasm = file_name.into();
                mat_data.artifact_hash = artifact_hash;
                mat_data.tg_name = Some(tg_name.clone());

                mat.data = map_from_object(mat_data.clone()).map_err(|e| e.to_string())?;

                tg.deps.push(wasm_path.clone());
                tg.meta
                    .ref_artifacts
                    .insert(mat_data.artifact_hash.clone(), wasm_path.clone());
            }
        }
        Ok(())
    }
}
