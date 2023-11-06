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
    const BASE_URL: &str =
        "https://github.com/metatypedev/metatype/raw/feat/MET-250/tale-of-three-binries/";
    let main_url = config
        .main_url
        .unwrap_or_else(|| BASE_URL.to_owned() + "typegate/src/main.ts");
    let import_map_url = config
        .import_map_url
        .unwrap_or_else(|| BASE_URL.to_owned() + "typegate/import_map.json");
    runtime.block_on(typegate_core::launch_typegate_deno(
        typegate_core::resolve_url(&main_url)?,
        Some(import_map_url),
    ))?;
    Ok(())
}
