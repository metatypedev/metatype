// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{global_store::Store, utils::fs_host};
use common::typegraph::{
    runtimes::deno::ModuleMatData,
    utils::{map_from_object, object_from_map},
    Materializer, Typegraph,
};
use std::path::PathBuf;

use crate::utils::postprocess::{compress_and_encode, PostProcessor};

pub struct DenoProcessor;

impl PostProcessor for DenoProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), crate::errors::TgError> {
        for mat in tg.materializers.iter_mut() {
            if mat.name.as_str() == "module" {
                match Self::resolve_module(mat)? {
                    Some(dep_path) => tg.deps.push(fs_host::make_relative(&dep_path)?),
                    None => continue,
                }
            }
        }
        Ok(())
    }
}

impl DenoProcessor {
    pub fn resolve_module(mat: &mut Materializer) -> Result<Option<PathBuf>, String> {
        let mut mat_data: ModuleMatData =
            object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
        let Some(path) = mat_data.code.strip_prefix("file:").to_owned() else {
            return Ok(None);
        };

        // main_path can be either relative or absolute,
        // if relative => make it absolute
        // fs::canonicalize wouldn't work in this setup
        let main_path = fs_host::make_absolute(&PathBuf::from(path))?;
        if !fs_host::path_exists(&main_path)? && !Store::get_cli_flag() {
            return Err(format!(
                "could not resolve module {:?}",
                main_path.display()
            ));
        }

        mat_data.code = compress_and_encode(&main_path)?;
        mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;

        Ok(Some(main_path))
    }
}
