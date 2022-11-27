// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod cli;
mod codegen;
#[cfg(test)]
mod tests;
mod ts;
mod typegraph;
mod utils;

use anyhow::{Ok, Result};
use clap::{Parser, Subcommand};
use cli::codegen::Codegen;
use cli::codegen::Commands as CodegenCommands;
use cli::deploy::Deploy;
use cli::dev::Dev;
use cli::prisma::Commands as PrismaCommands;
use cli::prisma::Prisma;
use cli::serialize::Serialize;
use cli::Action;
use common::get_version;

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None, disable_version_flag = true)]
struct Args {
    #[clap(short = 'C', long, value_parser, default_value_t = String::from("."))]
    dir: String,

    #[clap(short, long, value_parser)]
    version: bool,

    #[clap(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Serialize the typegraphs defined in the specified python file(s) into JSON.
    Serialize(Serialize),
    /// Adds files to myapp
    Prisma(Prisma),
    /// Adds files to myapp
    Dev(Dev),
    /// Adds files to myapp
    Deploy(Deploy),
    /// Codegen
    Codegen(Codegen),
    /// Upgrade
    Upgrade,
}

fn main() -> Result<()> {
    let args = Args::parse();

    if args.version {
        println!("Meta {}", common::get_version());
        return Ok(());
    }

    if let Some(command) = args.command {
        match command {
            Commands::Dev(dev) => {
                dev.run(args.dir)?;
            }
            Commands::Serialize(serialize) => {
                serialize.run(args.dir)?;
            }
            Commands::Prisma(prisma) => match prisma.command {
                PrismaCommands::Diff(diff) => {
                    diff.run(args.dir)?;
                }
                PrismaCommands::Format(format) => {
                    format.run(args.dir)?;
                }
                PrismaCommands::Dev(dev) => {
                    dev.run(args.dir)?;
                }
                PrismaCommands::Deploy(deploy) => {
                    deploy.run(args.dir)?;
                }
            },
            Commands::Deploy(deploy) => {
                deploy.run(args.dir)?;
            }
            Commands::Codegen(codegen) => match codegen.command {
                CodegenCommands::Deno(deno) => {
                    deno.run(args.dir)?;
                }
            },
            Commands::Upgrade => {
                let status = self_update::backends::github::Update::configure()
                    .repo_owner("metatypedev")
                    .repo_name("metatype")
                    .bin_name("meta")
                    .show_download_progress(true)
                    .current_version(&get_version())
                    .build()?
                    .update()?;
                println!("Update status: `{}`!", status.version());
            }
        }
    }

    Ok(())
}

#[test]
fn verify_cli() {
    use clap::CommandFactory;
    Args::command().debug_assert()
}
