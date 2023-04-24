// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod config;
mod errors;
mod runtimes;
mod typegraph;

use colored::Colorize;
use config::Config;
use envconfig::Envconfig;
use log::{error, info, Level};
use macros::deno_sync;
use once_cell::sync::Lazy;
use sentry::ClientInitGuard;
use std::io::Write;
use std::{borrow::Cow, env, fs, panic, path::PathBuf};
use tokio::runtime::Runtime;

static RT: Lazy<Runtime> = Lazy::new(|| Runtime::new().expect("failed to create Tokio runtime"));
static CONFIG: Lazy<Config> =
    Lazy::new(|| Config::init_from_env().expect("failed to parse config"));
static TMP_DIR: Lazy<PathBuf> = Lazy::new(|| {
    let path = env::current_dir().expect("no current dir").join("tmp");
    fs::create_dir_all(&path).expect("failed to create tmp dir");
    path
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
    SENTRY_GUARD.is_enabled();
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
