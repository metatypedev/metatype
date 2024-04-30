// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod deno;

use anyhow::Result;
use clap::{Parser, Subcommand};
use deno::Deno;

#[derive(Parser, Debug)]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Deno(Deno),
}

fn main() -> Result<()> {
    env_logger::init();
    let args = Args::parse();

    match args.command {
        Command::Deno(cmd) => cmd.run(),
    }
}
