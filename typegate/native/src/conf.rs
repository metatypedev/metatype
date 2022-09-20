// Copyright Metatype under the Elastic License 2.0.

use lazy_static::lazy_static;
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub debug: bool,
    pub sentry_dsn: Option<String>,
    pub sentry_sample_rate: f32,
    pub sentry_traces_sample_rate: f32,
}

lazy_static! {
    pub static ref CONFIG: Config = {
        let cm = ::config::Config::builder()
            .add_source(::config::Environment::default().separator("_"))
            .set_default("debug", false)
            .unwrap()
            .set_default("sentry_sample_rate", 1)
            .unwrap()
            .set_default("sentry_traces_sample_rate", 1)
            .unwrap()
            .build()
            .unwrap();

        cm.try_deserialize().expect("config cannot be parsed")
    };
}
