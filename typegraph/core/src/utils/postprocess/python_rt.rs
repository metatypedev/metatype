// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::deno::ModuleMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::{compress_and_encode, PostProcessor};

pub struct PythonProcessor;

impl PostProcessor for PythonProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "pymodule" {
                let mut mat_data: ModuleMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let Some(path) = mat_data.code.strip_prefix("file:").to_owned() else {
                    continue;
                };
                // main_path can be either relative or absolute,
                // if relative => make it absolute
                // fs::canonicalize wouldn't work in this setup
                let main_path = fs_host::make_absolute(&PathBuf::from(path))?;
                mat_data.code = compress_and_encode(&main_path)?;

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(main_path);
            }
        }
        Ok(())
    }
}
