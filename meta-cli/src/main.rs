mod cli;
mod codegen;
mod prisma;
mod ts;
mod typegraph;

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

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    #[clap(short = 'C', long, value_parser, default_value_t = String::from("."))]
    dir: String,

    #[clap(subcommand)]
    command: Commands,
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
}

fn main() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Commands::Dev(dev) => {
            dev.run(args.dir)?;
        }
        Commands::Serialize(serialize) => {
            serialize.run(args.dir)?;
        }
        Commands::Prisma(prisma) => match prisma.command {
            PrismaCommands::Apply(apply) => {
                apply.run(args.dir)?;
            }
            PrismaCommands::Diff(diff) => {
                diff.run(args.dir)?;
            }
            PrismaCommands::Format(format) => {
                format.run(args.dir)?;
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
    }

    Ok(())
}
