// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::utils::fs_host;
use common::typegraph::{
    runtimes::deno::{FunctionMatData, ModuleMatData},
    utils::{map_from_object, object_from_map},
    Materializer, Typegraph,
};
use std::path::PathBuf;
use typescript::parser::transform_script;

use crate::utils::postprocess::{compress_and_encode, PostProcessor};

pub struct DenoProcessor;

impl PostProcessor for DenoProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String> {
        for mat in tg.materializers.iter_mut() {
            match mat.name.as_str() {
                "function" => Self::reformat_materializer_script(mat),
                "module" => {
                    if let Some(main_path) = Self::resolve_module(mat)? {
                        tg.deps.push(fs_host::make_relative(&main_path)?);
                    }
                    Ok(())
                }
                _ => continue,
            }?;
        }
        Ok(())
    }
}

impl DenoProcessor {
    pub fn reformat_materializer_script(mat: &mut Materializer) -> Result<(), String> {
        if mat.name.as_str() == "function" {
            let mut mat_data: FunctionMatData =
                object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
            mat_data.script = transform_script(mat_data.script).map_err(|e| e.to_string())?;
            mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn resolve_module(mat: &mut Materializer) -> Result<Option<PathBuf>, String> {
        if mat.name.as_str() == "module" {
            let mut mat_data: ModuleMatData =
                object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;
            let Some(path) = mat_data.code.strip_prefix("file:").to_owned() else {
                return Ok(None);
            };

            // main_path can be either relative or absolute,
            // if relative => make it absolute
            // fs::canonicalize wouldn't work in this setup
            let main_path = fs_host::make_absolute(&PathBuf::from(path))?;
            mat_data.code = compress_and_encode(&main_path)?;

            mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;

            return Ok(Some(main_path));
        }
        Ok(None)
    }
}
