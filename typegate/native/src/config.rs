// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use envconfig::Envconfig;

#[derive(Envconfig)]
pub struct Config {
    #[envconfig(from = "DEBUG", default = "false")]
    pub debug: bool,
    #[envconfig(from = "SENTRY_DSN")]
    pub sentry_dsn: Option<String>,
    #[envconfig(from = "SENTRY_SAMPLE_RATE", default = "1.0")]
    pub sentry_sample_rate: f32,
    #[envconfig(from = "SENTRY_TRACES_SAMPLE_RATE", default = "1.0")]
    pub sentry_traces_sample_rate: f32,
}
