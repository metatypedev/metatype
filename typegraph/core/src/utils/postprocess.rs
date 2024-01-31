// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::{Path, PathBuf};

use common::typegraph::{
    runtimes::deno::ModuleMatData,
    utils::{map_from_object, object_from_map},
    Typegraph,
};

use super::fs_host;

fn compress_and_encode(main_rel_path: &Path) -> Result<String, String> {
    let cwd_path = fs_host::cwd()?;
    let file = match main_rel_path.strip_prefix(&cwd_path) {
        Ok(ret) => ret,
        Err(_) => {
            return Err(format!(
                "{:?} does not contain script {:?}",
                cwd_path.clone().display(),
                main_rel_path.display(),
            ))
        }
    };

    let enc_content = fs_host::compress_and_encode_base64(".")?;
    Ok(format!("file:{};base64:{}", file.display(), enc_content))
}

pub fn resolve_deno_modules(tg: &mut Typegraph) -> Result<(), String> {
    // if self.codegen {
    //     crate::codegen::deno::codegen(tg, tg.path.as_ref().unwrap())?;
    // }
    for mat in tg.materializers.iter_mut().filter(|m| m.name == "module") {
        let mut mat_data: ModuleMatData =
            object_from_map(std::mem::take(&mut mat.data)).map_err(|e| e.to_string())?;

        let Some(path) = mat_data.code.strip_prefix("file:").to_owned() else {
            continue;
        };

        let main_rel_path = PathBuf::from(path);
        mat_data.code = compress_and_encode(&main_rel_path)?;

        mat.data = map_from_object(mat_data).map_err(|e| e.to_string())?;
        tg.deps.push(main_rel_path.to_owned());
    }
    Ok(())
}
