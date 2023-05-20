// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod config;
mod errors;
mod runtimes;
mod typegraph;
mod typescript;

use colored::Colorize;
use config::Config;
use envconfig::Envconfig;
use log::{error, info, Level};
use macros::deno_sync;
use once_cell::sync::Lazy;
use sentry::ClientInitGuard;
use std::fs;
use std::io::Write;
use std::str::FromStr;
use std::{borrow::Cow, env, panic, path::PathBuf};
use tokio::runtime::Runtime;

static RT: Lazy<Runtime> = Lazy::new(|| Runtime::new().expect("failed to create Tokio runtime"));
static CONFIG: Lazy<Config> =
    Lazy::new(|| Config::init_from_env().expect("failed to parse config"));
static TMP_DIR: Lazy<PathBuf> = Lazy::new(|| {
    env::var("TMP_DIR")
        .map(|p| PathBuf::from_str(&p).expect("invalid TMP_DIR"))
        .unwrap_or_else(|_| env::current_dir().expect("no current dir").join("tmp"))
});
static SENTRY_GUARD: Lazy<ClientInitGuard> = Lazy::new(|| {
    let env = if CONFIG.debug {
        "development".to_string()
    } else {
        "production".to_string()
    };
    sentry::init((
        CONFIG.sentry_dsn.clone(),
        sentry::ClientOptions {
            release: Some(Cow::from(common::get_version())),
            environment: Some(Cow::from(env)),
            sample_rate: CONFIG.sentry_sample_rate,
            traces_sample_rate: CONFIG.sentry_traces_sample_rate,
            ..Default::default()
        },
    ))
});

#[deno_sync]
fn init_native() {
    env_logger::builder()
        .format_timestamp_millis()
        .format(|buf, record| {
            let location = match (record.level(), record.module_path(), record.line()) {
                (Level::Error, Some(module_path), Some(line))
                    if module_path.starts_with("native::") =>
                {
                    format!("\n    at {module_path}:{line}")
                }
                _ => Default::default(),
            };
            writeln!(
                buf,
                "{} {: <5} {: <12} {}{}",
                buf.timestamp_millis(),
                record.level(),
                record.target(),
                record.args(),
                location.dimmed(),
            )
        })
        .init();

    info!("init native");

    SENTRY_GUARD.is_enabled();

    if !TMP_DIR.exists() {
        // also required by Deno
        fs::create_dir_all(TMP_DIR.clone())
            .unwrap_or_else(|e| panic!("failed to create TMP_DIR {}: {}", TMP_DIR.display(), e));
    }

    let default_panic = std::panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        error!("Panic: {}", panic_info);
        default_panic(panic_info);
    }));
}

#[deno_sync]
fn get_version() -> String {
    common::get_version().to_string()
}
