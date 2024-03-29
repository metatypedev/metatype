// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::python::ModuleMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct PythonProcessor;

impl PostProcessor for PythonProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "pymodule" {
                let mat_data: ModuleMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let path = &mat_data.artifact;

                let main_path = fs_host::make_absolute(&PathBuf::from(path))?;

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(main_path);
            }
        }
        Ok(())
    }
}
