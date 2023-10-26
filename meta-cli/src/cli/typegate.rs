// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
use normpath::PathExt;

use crate::cli::{Action, GenArgs};

#[derive(Parser, Debug)]
pub struct Typegate {
    /// The root directory where typegate source files are located
    #[clap(long)]
    root_dir: Option<std::path::PathBuf>,
}

#[async_trait]
impl Action for Typegate {
    async fn run(&self, _gen_args: GenArgs) -> Result<()> {
        unreachable!()
    }
}

pub fn command(cmd: Typegate, gen_args: GenArgs) -> Result<()> {
    let cwd = match cmd.root_dir {
        Some(path) => path.clone().normalize()?.into_path_buf(),
        None => gen_args.dir()?,
    };
    let main_module = cwd.join("typegate/src/main.ts");
    mt_deno::run_sync(
        main_module,
        mt_deno::deno::deno_runtime::permissions::PermissionsOptions {
            allow_run: Some(["hostname"].into_iter().map(str::to_owned).collect()),
            allow_sys: Some(vec![]),
            allow_env: Some(vec![]),
            allow_hrtime: true,
            allow_write: Some(
                ["tmp"]
                    .into_iter()
                    .map(std::str::FromStr::from_str)
                    .collect::<Result<_, _>>()?,
            ),
            allow_ffi: Some(vec![]),
            allow_read: Some(
                ["."]
                    .into_iter()
                    .map(std::str::FromStr::from_str)
                    .collect::<Result<_, _>>()?,
            ),
            allow_net: Some(vec![]),
            ..Default::default()
        },
    );
    Ok(())
}
