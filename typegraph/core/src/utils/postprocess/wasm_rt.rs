// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::{Artifact, KnownRuntime, TGRuntime},
    Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct WasmProcessor;

impl PostProcessor for WasmProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for rt in &tg.runtimes {
            let TGRuntime::Known(KnownRuntime::Wasm(data)) = rt else {
                continue;
            };
            let path = PathBuf::from(&data.wasm_artifact);
            if tg.meta.artifacts.contains_key(&path) {
                continue;
            }

            let wasi_path = fs_host::make_absolute(&path)?;

            let (hash, size) = fs_host::hash_file(&wasi_path)?;

            tg.deps.push(wasi_path.clone());
            tg.meta
                .artifacts
                .insert(path.clone(), Artifact { hash, size, path });
        }
        Ok(())
    }
}
