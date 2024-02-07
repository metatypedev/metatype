// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{utils::fs_host, wit::metatype::typegraph::host::get_cwd};
use common::typegraph::Typegraph;
use std::path::Path;
pub mod deno_rt;
pub mod prisma_rt;
pub mod python_rt;
pub mod wasmedge_rt;

pub fn compress_and_encode(main_path: &Path) -> Result<String, String> {
    if let Err(e) = fs_host::read_text_file(main_path.display().to_string()) {
        return Err(format!("Unable to read {:?}: {}", main_path.display(), e));
    }

    let enc_content = fs_host::compress_and_encode_base64(get_cwd()?)?;
    Ok(format!(
        "file:{};base64:{}",
        fs_host::make_relative(main_path)?.display(),
        enc_content
    ))
}

pub trait PostProcessor {
    fn postprocess(self, tg: &mut Typegraph) -> Result<(), String>;
}
