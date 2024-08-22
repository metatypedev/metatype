// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod config;
mod logger;
use std::{borrow::Cow, path::Path};

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
            release: Some(Cow::from(typegate_engine::build::PKG_VERSION)),
            environment: Some(Cow::from(env)),
            sample_rate: config.sentry_sample_rate,
            traces_sample_rate: config.sentry_traces_sample_rate,
            ..Default::default()
        },
    ))
}

fn main() {
    logger::init();
    if cfg!(debug_assertions) {
        typegate_engine::new_thread_builder()
            .spawn(main_main)
            .unwrap()
            .join()
            .unwrap()
            .unwrap();
    } else {
        main_main().unwrap();
    }
}

fn main_main() -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> {
    let config = Config::init_from_env()?;

    let _sentry_guard = init_sentry(&config);
    let runtime = typegate_engine::runtime();
    let workspace_dir = Path::new(location_macros::workspace_dir!());
    let main_url = config.main_url.unwrap_or_else(|| {
        workspace_dir
            .join("typegate/src/main.ts")
            .to_string_lossy()
            .into()
    });
    let import_map_url = config.import_map_url.unwrap_or_else(|| {
        workspace_dir
            .join("typegate/import_map.json")
            .to_string_lossy()
            .into()
    });
    runtime.block_on(typegate_engine::launch_typegate_deno(
        typegate_engine::resolve_url_or_path(&main_url, workspace_dir)?,
        Some(import_map_url),
    ))?;

    Ok(())
}
