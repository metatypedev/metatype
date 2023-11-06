// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::Result;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Typegate {}

impl Typegate {
    pub fn run(self) -> Result<()> {
        let runtime = typegate_core::runtime();
        let cwd = std::env::current_dir()?;
        let main_url = cwd.join("typegate/src/main.ts");
        let import_map_url = cwd.join("typegate/import_map.json");
        runtime.block_on(typegate_core::launch_typegate_deno(
            typegate_core::resolve_url_or_path("", &main_url)?,
            Some(import_map_url.to_string_lossy().into()),
        ))?;
        Ok(())
    }
}
