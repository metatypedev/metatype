// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use crate::cli::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Typegate {
    /// The url to the `main.ts` module of typegate deno
    #[clap(long)]
    main_url: Option<String>,
    /// The url to the `import_map.json` manifest for typegate
    #[clap(long)]
    import_map_url: Option<String>,
}

#[async_trait]
impl Action for Typegate {
    async fn run(&self, _gen_args: GenArgs) -> Result<()> {
        unreachable!()
    }
}

pub fn command(cmd: Typegate, _gen_args: GenArgs) -> Result<()> {
    let runtime = typegate_engine::runtime();
    const BASE_URL: &str =
        "https://github.com/metatypedev/metatype/raw/feat/MET-250/tale-of-three-binries/";
    let main_url = cmd
        .main_url
        .unwrap_or_else(|| BASE_URL.to_owned() + "typegate/src/main.ts");
    let import_map_url = cmd
        .import_map_url
        .unwrap_or_else(|| BASE_URL.to_owned() + "typegate/import_map.json");
    runtime.block_on(typegate_engine::launch_typegate_deno(
        // typegate_core::resolve_url_or_path(
        //     "",
        //     &std::env::current_dir()?.join("./typegate/src/main.ts"),
        // )?,
        typegate_engine::resolve_url(&main_url)?,
        Some(import_map_url),
    ))?;
    Ok(())
}
