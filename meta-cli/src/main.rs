mod cli;
mod prisma;
use anyhow::{Ok, Result};
use clap::{Parser, Subcommand};
use cli::deploy::Deploy;
use cli::dev::Dev;
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
    /// Adds files to myapp
    Serialize(Serialize),
    /// Adds files to myapp
    Prisma(Prisma),
    /// Adds files to myapp
    Dev(Dev),
    /// Adds files to myapp
    Deploy(Deploy),
}

fn main() -> Result<()> {
    let args = Args::parse();
    println!("Hello {:?}!", args);

    match args.command {
        Commands::Dev(dev) => {
            dev.run(args.dir)?;
        }
        _ => {} //Commands::Serialize(serialize) => {}
                //Commands::Prisma(prisma) => {}
                //Commands::Deploy(deploy) => {}
    }

    Ok(())
}
