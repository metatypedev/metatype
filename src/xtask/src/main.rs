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
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info,actix_server=warn");
    }
    if std::env::var("RUST_SPANTRACE").is_err() {
        std::env::set_var("RUST_SPANTRACE", "0");
    }
    color_eyre::install().unwrap();

    use tracing_subscriber::prelude::*;

    let fmt = tracing_subscriber::fmt::layer()
        .without_time()
        .with_writer(std::io::stderr)
        // .pretty()
        // .with_file(true)
        // .with_line_number(true)
        .with_target(false);

    #[cfg(test)]
    let fmt = fmt.with_test_writer();

    #[cfg(debug_assertions)]
    let fmt = fmt.with_target(true);

    let filter = tracing_subscriber::EnvFilter::from_default_env();

    tracing_subscriber::registry()
        // filter on values from RUST_LOG
        .with(filter)
        // subscriber that emits to stderr
        .with(fmt)
        // instrument errors with SpanTraces, used by color-eyre
        .with(tracing_error::ErrorLayer::default())
        .init();
    let args = Args::parse();

    match args.command {
        Command::Deno(cmd) => cmd.run(),
    }
}
