// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use crate::cli::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Deno {}

#[async_trait]
impl Action for Deno {
    async fn run(&self, _gen_args: GenArgs) -> Result<()> {
        unreachable!()
    }
}

pub fn start_sync(_args: Deno, gen_args: GenArgs) -> Result<()> {
    // let w = 60;
    // let c = 20;
    //
    // ui::title("Deno: TODO", w);
    let cwd = gen_args.dir()?;
    let main_module = cwd.join("src/main.ts");
    let config_file = cwd.join("deno.json");
    // let rt = tokio::runtime::Builder::new_current_thread()
    //     .enable_all()
    //     .build()?;
    // rt.block_on(deno::start(&cwd, &main_module, &config_file))
    deno::start_sync(main_module, config_file);
    Ok(())
}
