// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod cli;
mod codegen;
mod config;
mod fs;
#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use anyhow::{bail, Result};
use clap::error::ErrorKind;
use clap::Parser;
use cli::Action;
use cli::Args;

#[tokio::main]
async fn main() -> Result<()> {
    let args = match Args::try_parse() {
        Ok(args) => args,
        Err(e) => {
            if e.kind() == ErrorKind::DisplayHelp {
                println!("Meta {}\n{}", common::get_version(), e.render().ansi());
                return Ok(());
            }
            bail!("{}", e.render().ansi());
        }
    };

    if args.version || args.command.is_none() {
        println!("Meta {}", common::get_version());
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
