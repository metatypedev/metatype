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
    pub use futures::prelude::*;
    pub use futures_concurrency::prelude::*;

    pub use crate::{anyhow_to_eyre, map_ferr};
}

mod cli;
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
    /* FIXME: handle broken pipe on all `println!` calls
     * setting default SIG_PIPE behaviour would be one
     * solution but since we also have a web server in this
     * program, we don't want it terminating when the client
     * hangs up for reason.
     *
     * I've gone with the hack solution for now but it won't
     * do for long.
     * https://github.com/metatypedev/metatype/issues/728
     */
    #[cfg(unix)]
    unsafe {
        use nix::sys::signal::*;
        signal(Signal::SIGPIPE, SigHandler::SigDfl)
    }
    .unwrap();
    let args = match Args::try_parse() {
        Ok(cli) => cli,
        Err(err) => err.exit(),
    };

    if args.verbose.is_present() {
        std::env::set_var("RUST_LOG", args.verbose.log_level_filter().to_string());
    }
    logger::init();

    let runner = actix::System::with_tokio_rt(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap_or_log()
    });

    if let Err(err) = runner.block_on(upgrade_check()) {
        warn!("cannot check for update: {err}");
    }

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
        Some(command) => runner.block_on(async move {
            match command {
                cli::Commands::Serialize(_) | cli::Commands::Dev(_) | cli::Commands::Deploy(_) => {
                    let server = init_server().unwrap();
                    let command = command.run(args.config, Some(server.handle()));

                    try_join!(command, server.map(|_| Ok(()))).map(|_| ())
                }
                _ => command.run(args.config, None).await.map(|_| ()),
            }
        })?,
        None => Args::command().print_help()?,
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
