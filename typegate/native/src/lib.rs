// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod config;
mod runtimes;
mod typegraph;

use envconfig::Envconfig;
use lazy_static::lazy_static;
use log::info;
use macros::deno;
use std::{borrow::Cow, panic};
use tokio::runtime::Runtime;

lazy_static! {
    pub static ref CONFIG: config::Config = config::Config::init_from_env().unwrap();
    static ref RT: Runtime = {
        info!("Runtime created");
        Runtime::new().unwrap()
    };
    static ref SENTRY: sentry::ClientInitGuard = {
        sentry::init((
            CONFIG.sentry_dsn.clone(),
            sentry::ClientOptions {
                release: Some(Cow::from(common::get_version())),
                environment: Some(Cow::from(if CONFIG.debug {
                    "development".to_string()
                } else {
                    "production".to_string()
                })),
                sample_rate: CONFIG.sentry_sample_rate,
                traces_sample_rate: CONFIG.sentry_traces_sample_rate,
                ..Default::default()
            },
        ))
    };
}

#[deno]
fn init() {
    env_logger::init();
    info!("init");
    let default_panic = std::panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        println!("ERRROR");
        default_panic(panic_info);
    }));
}

#[deno]
fn get_version() -> String {
    common::get_version()
}
