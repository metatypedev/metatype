// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{runtimes::Artifact, Typegraph};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct WasmProcessor;

impl PostProcessor for WasmProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "wasi" {
                let path = mat.data.get("wasmArtifact").unwrap();
                let path: PathBuf = path.as_str().unwrap().into();

                if tg.meta.artifacts.contains_key(&path) {
                    continue;
                }

                let wasi_path = fs_host::make_absolute(&path)?;

                let (hash, size) = fs_host::hash_file(&wasi_path.clone())?;

                tg.deps.push(wasi_path.clone());
                tg.meta
                    .artifacts
                    .insert(path.clone(), Artifact { hash, size, path });
            }
        }
        Ok(())
    }
}
