// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[allow(unused)]
mod interlude {
    pub use std::{
        collections::HashMap,
        path::{Path, PathBuf},
        sync::{Arc, Mutex},
    };

    pub use color_eyre::{
        eyre::{
            self as eyre, self as anyhow, bail, ensure, format_err, format_err as ferr,
            ContextCompat, OptionExt, Result, WrapErr,
        },
        owo_colors::{self, colored},
        Section, SectionExt,
    };
    pub use serde::{Deserialize, Serialize};
    pub use tracing::instrument::Instrument;
    pub use tracing::{debug, error, info, trace, warn};
    pub use tracing_unwrap::*;
    pub mod log {
        pub use tracing::{debug, error, info, trace, warn};
    }
    pub use async_trait::async_trait;

    pub use crate::{anyhow_to_eyre, map_ferr};
}

mod cli;
mod codegen;
mod com;
mod config;
pub mod deploy;
mod fs;
mod global_config;
mod logger;
mod macros;
mod secrets;

#[cfg(test)]
mod tests;
mod typegraph;
mod utils;

use crate::interlude::*;
use clap::CommandFactory;

use clap::Parser;
use cli::upgrade::upgrade_check;
use cli::Action;
use cli::Args;
use com::server::init_server;
use futures::try_join;
use futures::FutureExt;
use shadow_rs::shadow;

shadow!(build);

#[tracing::instrument]
fn main() -> Result<()> {
    setup_panic_hook();

    let args = match Args::try_parse() {
        Ok(cli) => cli,
        Err(err) => err.exit(),
    };

    if args.verbose.is_present() {
        std::env::set_var("RUST_LOG", args.verbose.log_level_filter().to_string());
    }
    logger::init().context("error setting up logger")?;

    let _ = actix::System::with_tokio_rt(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap_or_log()
    });

    actix::run(async {
        upgrade_check()
            .await
            .unwrap_or_else(|e| warn!("cannot check for update: {}", e));
    })?;

    if args.version {
        println!("meta {}", build::PKG_VERSION);
        return Ok(());
    }

    match args.command {
        // the deno task requires use of a single thread runtime which it'll spawn itself
        Some(cli::Commands::Typegate(cmd_args)) => cli::typegate::command(cmd_args, args.config)?,
        Some(cli::Commands::Gen(gen_args)) => {
            // metagen relies on on some tokio infra
            // that doesn't mesh well with actix
            tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()?
                .block_on(
                    async {
                        let server = init_server().unwrap();
                        let command = gen_args.run(args.config, Some(server.handle()));

                        try_join!(command, server.map(|_| Ok(())))
                    }
                    .in_current_span(),
                )?;
        }
        Some(command) => actix::run(async move {
            match command {
                cli::Commands::Serialize(_) | cli::Commands::Dev(_) | cli::Commands::Deploy(_) => {
                    let server = init_server().unwrap();
                    let command = command.run(args.config, Some(server.handle()));

                    try_join!(command, server.map(|_| Ok(()))).unwrap_or_else(|err| {
                        error!("{err:?}");
                        std::process::exit(1);
                    });
                }
                _ => {
                    command.run(args.config, None).await.unwrap_or_else(|err| {
                        error!("{err:?}");
                        std::process::exit(1);
                    });
                }
            }
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
