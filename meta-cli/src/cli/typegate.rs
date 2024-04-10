// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use actix_web::dev::ServerHandle;
use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use crate::cli::{Action, ConfigArgs};

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
    async fn run(&self, _gen_args: ConfigArgs, _: Option<ServerHandle>) -> Result<()> {
        unreachable!()
    }
}

pub fn command(_cmd: Typegate, _gen_args: ConfigArgs) -> Result<()> {
    #[cfg(not(feature = "typegate"))]
    {
        panic!("typegate feature is not enabled. Please enable the cargo feature `typegate` to use this subcommand.")
    }
    #[cfg(feature = "typegate")]
    {
        let cmd = _cmd;
        let runtime = typegate_engine::runtime();
        const BASE_URL: &str = "https://raw.githubusercontent.com/metatypedev/metatype/";
        let main_url = cmd.main_url.unwrap_or_else(|| {
            BASE_URL.to_owned() + crate::build::COMMIT_HASH + "/typegate/src/main.ts"
        });
        let import_map_url = cmd.import_map_url.unwrap_or_else(|| {
            BASE_URL.to_owned() + crate::build::COMMIT_HASH + "/typegate/import_map.json"
        });

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
}
