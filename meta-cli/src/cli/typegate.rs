// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;

use crate::cli::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Typegate {
    /// The root directory where typegate source files are located
    #[clap(long)]
    root_dir: Option<String>,
}

#[async_trait]
impl Action for Typegate {
    async fn run(&self, _gen_args: GenArgs) -> Result<()> {
        unreachable!()
    }
}

pub fn start_sync(args: Typegate, gen_args: GenArgs) -> Result<()> {
    let cwd = match args.root_dir {
        Some(path) => path.parse()?,
        None => gen_args.dir()?,
    };
    let main_module = cwd.join("src/main.ts");
    let config_file = cwd.join("deno.json");
    let lock_file = cwd.join("deno.lock");
    meta_deno::start_sync(main_module, config_file, lock_file);
    Ok(())
}
