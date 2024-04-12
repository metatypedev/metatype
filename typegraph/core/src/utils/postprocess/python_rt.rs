// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::{python::ModuleMatData, Artifact},
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
                let mut mat_data: ModuleMatData =
                    object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
                let path = PathBuf::from(&mat_data.python_artifact);

                if tg.meta.artifacts.contains_key(&path) {
                    continue;
                }

                let python_module_path = fs_host::make_absolute(&path)?;

                let (module_hash, size) = fs_host::hash_file(&python_module_path.clone())?;

                tg.deps.push(python_module_path);
                tg.meta.artifacts.insert(
                    path.clone(),
                    Artifact {
                        hash: module_hash.clone(),
                        size,
                        path,
                    },
                );

                let deps = mat_data.deps.clone();
                let mut dep_artifacts = vec![];
                for dep in deps {
                    let dep_rel_path = PathBuf::from(dep);
                    let dep_abs_path = fs_host::make_absolute(&dep_rel_path)?;

                    let (dep_hash, dep_size) = fs_host::hash_file(&dep_abs_path)?;
                    let dep_artifact = Artifact {
                        path: dep_rel_path.clone(),
                        hash: dep_hash,
                        size: dep_size,
                    };
                    tg.meta.artifacts.insert(dep_rel_path, dep_artifact.clone());
                    dep_artifacts.push(dep_artifact);
                    tg.deps.push(dep_abs_path);
                }
                mat_data.deps_meta = Some(
                    dep_artifacts
                        .iter()
                        .map(|dep| map_from_object(dep).map_err(|e| e.to_string()))
                        .collect::<Result<Vec<_>, _>>()?,
                );

                mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }
}
