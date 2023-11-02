// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod cli;
mod codegen;
mod config;
pub mod deploy;
mod fs;
mod global_config;
mod logger;
#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use anyhow::Result;
use clap::CommandFactory;

use clap::Parser;
use cli::upgrade::upgrade_check;
use cli::Action;
use cli::Args;
use log::warn;

#[actix::main]
async fn main() -> Result<()> {
    logger::init();

    upgrade_check()
        .await
        .unwrap_or_else(|e| warn!("cannot check for update: {}", e));

    let args = match Args::try_parse() {
        Ok(cli) => cli,
        Err(e) => {
            e.print()?;
            return Ok(());
        }
    };

    if args.version {
        println!("meta {}", common::get_version());
        return Ok(());
    }

    match args.command {
        Some(command) => command.run(args.gen).await?,
        None => Args::command().print_help()?,
    }

    Ok(())
}

#[test]
fn verify_cli() {
    use clap::CommandFactory;
    Args::command().debug_assert()
}

#[test]
fn end_to_end() {
    // need build before running this test
    use assert_cmd::Command;

    let mut cmd = Command::cargo_bin("meta").unwrap();
    cmd.assert().success();
}
