// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod conf;
mod runtimes;
mod typegraph;

use crate::conf::CONFIG;
use deno_bindgen::deno_bindgen;
use lazy_static::lazy_static;
use log::info;
use static_init::dynamic;
use std::{borrow::Cow, panic};
use tokio::runtime::Runtime;

lazy_static! {
    static ref RT: Runtime = {
        info!("Runtime created");
        Runtime::new().unwrap()
    };
}

#[dynamic]
#[allow(dead_code)]
static SENTRY: sentry::ClientInitGuard = {
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

#[deno_bindgen]
fn init() {
    env_logger::init();
    info!("init");
    let default_panic = std::panic::take_hook();
    panic::set_hook(Box::new(move |panic_info| {
        println!("ERRROR");
        default_panic(panic_info);
    }));
}

#[deno_bindgen]
fn get_version() -> String {
    common::get_version()
}
