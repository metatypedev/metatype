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
        let tg_name = tg.name().unwrap();
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "pymodule" {
                let mut mat_data: ModuleMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let Some(path) = mat_data.artifact.strip_prefix("file:").to_owned() else {
                    continue;
                };

                let main_path = fs_host::make_absolute(&PathBuf::from(path))?;
                let artifact_name = path.split('/').last().unwrap();
                mat_data.artifact = artifact_name.into();
                mat_data.tg_name = Some(tg_name.clone());

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
                tg.deps.push(main_path);
            }
        }
        Ok(())
    }
}
