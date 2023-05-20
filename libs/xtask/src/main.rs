// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod codegen;

use anyhow::Result;
use clap::{Parser, Subcommand};
use codegen::Codegen;

#[derive(Parser, Debug)]
struct Args {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    Codegen(Codegen),
}

fn main() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Command::Codegen(cg) => cg.run(),
    }
}
