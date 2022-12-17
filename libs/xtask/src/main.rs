// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod codegen;

use anyhow::Result;
use clap::{Parser, Subcommand};
use codegen::Codegen;

#[derive(Parser, Debug)]
#[command()]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Codegen(Codegen),
}

fn main() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Commands::Codegen(cg) => cg.run(),
    }
}
