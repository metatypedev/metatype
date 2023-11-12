// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod codegen;
mod deno;
mod typegate;

use anyhow::Result;
use clap::{Parser, Subcommand};
use codegen::Codegen;
use deno::Deno;
use typegate::Typegate;

#[derive(Parser, Debug)]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Codegen(Codegen),
    Deno(Deno),
    Typegate(Typegate),
}

fn main() -> Result<()> {
    env_logger::init();
    let args = Args::parse();

    match args.command {
        Command::Codegen(cg) => cg.run(),
        Command::Deno(cmd) => cmd.run(),
        Command::Typegate(cmd) => cmd.run(),
    }
}
