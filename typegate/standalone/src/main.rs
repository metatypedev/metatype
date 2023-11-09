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
    let runtime = typegate_engine::runtime();
    let cwd = std::env::current_dir()?;
    let main_url = config
        .main_url
        .unwrap_or_else(|| cwd.join("typegate/src/main.ts").to_string_lossy().into());
    let import_map_url = config.import_map_url.unwrap_or_else(|| {
        cwd.join("typegate/import_map.json")
            .to_string_lossy()
            .into()
    });
    runtime.block_on(typegate_engine::launch_typegate_deno(
        typegate_engine::resolve_url_or_path(&main_url, &cwd)?,
        Some(import_map_url),
    ))?;
    Ok(())
}
