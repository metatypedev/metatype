// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Strategy {
    Linear,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RetryConfig {
    pub min_backoff_ms: Option<f64>,
    pub max_backoff_ms: Option<f64>,
    pub max_retries: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RetryStrategy {
    min_backoff_ms: f64,
    max_backoff_ms: f64,
    max_retries: f64,
}

impl RetryStrategy {
    pub fn new(config: RetryConfig) -> Result<Self> {
        if config.max_retries < 1.0 {
            bail!("maxRetries < 1".to_string())
        }

        let (min, max) = match (config.min_backoff_ms, config.max_backoff_ms) {
            (Some(min), Some(max)) => (min, max),
            (Some(min), None) => (min, min + 10.0 * 1000.0),
            (None, Some(max)) => (max - 10.0 * 1000.0, max),
            (None, None) => (0.0, 10.0 * 1000.0),
        };

        if min < 0.0 {
            bail!("minBackoffMs < 0".to_string());
        }

        if min >= max {
            bail!("minBackoffMs >= maxBackoffMs".to_string());
        }

        Ok(Self {
            min_backoff_ms: min,
            max_backoff_ms: max,
            max_retries: config.max_retries,
        })
    }

    pub fn eval(&self, strategy: Strategy, retries_left: f64) -> Result<f64> {
        if retries_left < 0.0 {
            bail!("retries_left < 0".to_string())
        }

        Ok(match strategy {
            Strategy::Linear => self.linear(retries_left),
        })
    }

    fn linear(&self, retries_left: f64) -> f64 {
        let dt = self.max_backoff_ms - self.min_backoff_ms;
        dt * (self.max_retries - retries_left) / self.max_retries
    }
}
