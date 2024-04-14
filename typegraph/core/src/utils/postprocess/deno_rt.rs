// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{global_store::Store, utils::fs_host};
use common::typegraph::{
    runtimes::{deno::ModuleMatData, Artifact},
    utils::{map_from_object, object_from_map},
    Materializer, Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::PostProcessor;

pub struct ResolveModuleOuput {
    tg_artifacts: Vec<Artifact>,
    tg_deps_paths: Vec<PathBuf>,
}

pub struct DenoProcessor;

impl PostProcessor for DenoProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "module" {
                match Self::resolve_module(mat)? {
                    Some(ResolveModuleOuput {
                        tg_deps_paths: dep_paths,
                        tg_artifacts: artifacts,
                    }) => {
                        for i in 0..artifacts.len() {
                            let artifact = &artifacts[i];
                            let dep_path = &dep_paths[i];
                            tg.deps.push(dep_path.clone());
                            tg.meta
                                .artifacts
                                .insert(artifact.path.clone(), artifact.clone());
                        }
                    }
                    None => continue,
                }
            }
        }
        Ok(())
    }
}

impl DenoProcessor {
    pub fn resolve_module(mat: &mut Materializer) -> Result<Option<ResolveModuleOuput>, String> {
        let mut mat_data: ModuleMatData =
            object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;

        let prefixed_path = mat_data
            .deno_artifact
            .get("path")
            .unwrap()
            .as_str()
            .unwrap();

        let Some(path) = prefixed_path.strip_prefix("file:").to_owned() else {
            return Ok(None);
        };

        let path = PathBuf::from(path);

        // main_path can be either relative or absolute,
        // if relative => make it absolute
        // fs::canonicalize wouldn't work in this setup
        let main_path = fs_host::make_absolute(&path)?;

        let mut tg_deps_paths = vec![];
        let mut tg_artifacts = vec![];

        match fs_host::path_exists(&main_path)? {
            true => {
                let (module_hash, size) = fs_host::hash_file(&main_path.clone())?;

                let deno_artifact = Artifact {
                    hash: module_hash.clone(),
                    size,
                    path: path.clone(),
                };
                tg_deps_paths.push(main_path);

                let deps = mat_data.deps.clone();
                for dep in deps {
                    let dep_rel_path = PathBuf::from(dep);
                    let dep_abs_path = fs_host::make_absolute(&dep_rel_path)?;

                    let (dep_hash, dep_size) = fs_host::hash_file(&dep_abs_path)?;
                    let dep_artifact = Artifact {
                        path: dep_rel_path.clone(),
                        hash: dep_hash,
                        size: dep_size,
                    };
                    tg_artifacts.push(dep_artifact);
                    tg_deps_paths.push(dep_abs_path);
                }

                // update post process results
                mat_data.deno_artifact = map_from_object(Artifact {
                    hash: module_hash.clone(),
                    size,
                    path,
                })
                .map_err(|e| e.to_string())?;

                mat_data.deps_meta = Some(
                    tg_artifacts
                        .iter()
                        .map(|dep| map_from_object(dep).map_err(|e| e.to_string()))
                        .collect::<Result<Vec<_>, _>>()?,
                );
                tg_artifacts.push(deno_artifact);
            }
            false => {
                if !Store::get_codegen_flag() {
                    return Err(format!(
                        "could not resolve module {:?}",
                        main_path.display()
                    ));
                } // else cli codegen
            }
        }

        mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;

        Ok(Some(ResolveModuleOuput {
            tg_artifacts,
            tg_deps_paths,
        }))
    }
}
