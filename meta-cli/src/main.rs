// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod cli;
mod codegen;
mod config;
mod fs;
mod global_config;
mod logger;
#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use anyhow::{bail, Result};
use clap::error::ErrorKind;
use clap::Parser;
use cli::upgrade::upgrade_check;
use cli::Action;
use cli::Args;
use log::warn;

#[tokio::main]
async fn main() -> Result<()> {
    logger::init();

    upgrade_check()
        .await
        .unwrap_or_else(|e| warn!("cannot check for update: {}", e));

    let args = match Args::try_parse() {
        Ok(args) => args,
        Err(e) => {
            if e.kind() == ErrorKind::DisplayHelp {
                println!("meta {}\n{}", common::get_version(), e.render().ansi());
                return Ok(());
            }
            bail!("{}", e.render().ansi());
        }
    };

    if args.version || args.command.is_none() {
        println!("meta {}", common::get_version());
        return Ok(());
    }

    if let Some(command) = args.command {
        command.run(args.gen).await?;
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
