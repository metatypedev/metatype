// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod cli;
mod codegen;
mod config;
pub mod deploy;
mod fs;
mod global_config;
mod logger;
#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use anyhow::Result;
use clap::CommandFactory;

use clap::Parser;
use cli::upgrade::upgrade_check;
use cli::Action;
use cli::Args;
use log::{error, warn};

use shadow_rs::shadow;

shadow!(build);

fn main() -> Result<()> {
    setup_panic_hook();
    logger::init();

    let _ = actix::System::with_tokio_rt(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap()
    });

    actix::run(async {
        upgrade_check()
            .await
            .unwrap_or_else(|e| warn!("cannot check for update: {}", e));
    })?;

    let args = match Args::try_parse() {
        Ok(cli) => cli,
        Err(e) => {
            e.print()?;
            return Ok(());
        }
    };

    if args.version {
        println!("meta {}", common::get_version());
        return Ok(());
    }

    match args.command {
        // the deno task requires use of a single thread runtime which it'll spawn itself
        Some(cli::Commands::Typegate(cmd_args)) => cli::typegate::command(cmd_args, args.gen)?,
        Some(command) => actix::run(async move {
            command.run(args.gen).await.unwrap_or_else(|e| {
                error!("{}", e.to_string());
                std::process::exit(1);
            });
        })?,
        None => Args::command().print_help()?,
    }

    Ok(())
}

fn setup_panic_hook() {
    // This function does two things inside of the panic hook:
    // - Tokio does not exit the process when a task panics, so we define a custom
    //   panic hook to implement this behaviour.
    // - We print a message to stderr to indicate that this is a bug in Deno, and
    //   should be reported to us.
    let orig_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        eprintln!("\n============================================================");
        eprintln!("Metatype has panicked. This is a bug, please report this");
        eprintln!("at https://github.com/metatypedev/metatype/issues/new.");
        eprintln!("If you can reliably reproduce this panic, try to include the");
        eprintln!("reproduction steps, output of meta-cli doctor and");
        eprintln!("a panic backtrace in your report. (re-run with the RUST_BACKTRACE=1");
        eprintln!("env var to enable backtraces)");
        eprintln!();
        eprintln!(
            "Platform: {} {}",
            std::env::consts::OS,
            std::env::consts::ARCH
        );
        eprintln!("Version: {}", build::VERSION);
        eprintln!("Args: {:?}", std::env::args().collect::<Vec<_>>());
        eprintln!();
        orig_hook(panic_info);
        std::process::exit(1);
    }));
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
