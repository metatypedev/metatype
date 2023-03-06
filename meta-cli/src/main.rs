// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod cli;
mod codegen;
mod config;
#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use anyhow::{bail, Result};
use clap::error::ErrorKind;
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
use std::path::Path;

#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None, disable_version_flag = true)]
struct Args {
    #[clap(short = 'C', long, value_parser, default_value_t = String::from("."))]
    dir: String,

    /// path to the config file
    #[clap(long, value_parser)]
    config: Option<String>,

    #[clap(short, long, value_parser)]
    version: bool,

    #[clap(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Serialize the typegraphs defined in the specified python file(s) into JSON.
    Serialize(Serialize),
    /// Manage prisma migration
    Prisma(Prisma),
    /// Push typegraph(s) with development mode features enabled
    Dev(Dev),
    /// Push typegraph(s) to typegate
    Deploy(Deploy),
    /// Generate materializers code from typegraph definition
    Codegen(Codegen),
    /// Upgrade
    Upgrade,
}

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

    if args.version {
        println!("Meta {}", common::get_version());
        return Ok(());
    }

    let config_path = args.config.map(|c| Path::new(&c).to_owned());

    if let Some(command) = args.command {
        match command {
            Commands::Dev(dev) => {
                dev.run(args.dir, config_path).await?;
            }
            Commands::Serialize(serialize) => {
                serialize.run(args.dir, config_path).await?;
            }
            Commands::Prisma(prisma) => match prisma.command {
                PrismaCommands::Diff(diff) => {
                    diff.run(args.dir, config_path).await?;
                }
                PrismaCommands::Format(format) => {
                    format.run(args.dir, config_path).await?;
                }
                PrismaCommands::Dev(dev) => {
                    dev.run(args.dir, config_path).await?;
                }
                PrismaCommands::Deploy(deploy) => {
                    deploy.run(args.dir, config_path).await?;
                }
            },
            Commands::Deploy(deploy) => {
                deploy.run(args.dir, config_path).await?;
            }
            Commands::Codegen(codegen) => match codegen.command {
                CodegenCommands::Deno(deno) => {
                    deno.run(args.dir, config_path).await?;
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

#[test]
fn end_to_end() {
    // need build before running this test
    use assert_cmd::Command;

    let mut cmd = Command::cargo_bin("meta").unwrap();
    cmd.assert().success();
}
