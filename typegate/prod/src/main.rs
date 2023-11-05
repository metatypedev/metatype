// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod config;
mod logger;
use std::borrow::Cow;

use config::Config;
use envconfig::Envconfig;

pub fn init_sentry(config: &Config) -> sentry::ClientInitGuard {
    let env = if config.debug {
        "development".to_string()
    } else {
        "production".to_string()
    };
    sentry::init((
        config.sentry_dsn.clone(),
        sentry::ClientOptions {
            release: Some(Cow::from(common::get_version())),
            environment: Some(Cow::from(env)),
            sample_rate: config.sentry_sample_rate,
            traces_sample_rate: config.sentry_traces_sample_rate,
            ..Default::default()
        },
    ))
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    logger::init();
    let config = Config::init_from_env()?;
    let _sentry_guard = init_sentry(&config);
    let runtime = typegate_core::runtime();
    runtime.block_on(typegate_core::launch_typegate_deno(
        typegate_core::resolve_url_or_path("", &std::env::current_dir()?.join("./src/main.ts"))?,
        // typegate_core::resolve_url("https://github.com/metatypedev/metatype/raw/feat/MET-250/refactor-ffi/typegate/src/main.ts")?,
    ))?;
    Ok(())
}
