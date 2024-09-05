// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use std::time::Duration;

use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Info,
    Warning,
    Error,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case", tag = "type", content = "text")]
pub enum MessageEntry {
    Info(String),
    Warning(String),
    Error(String),
}

#[derive(Deserialize, Debug)]
pub struct Migrations {
    pub runtime: String,
    pub migrations: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResultRaw {
    pub name: String,
    pub messages: Vec<MessageEntry>,
    pub migrations: Vec<Migrations>,
    pub failure: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
pub struct DatabaseResetRequired {
    message: String,
    runtime_name: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(unused)]
pub struct NullConstraintViolation {
    message: String,
    runtime_name: String,
    column: String,
    migration_name: String,
    is_new_column: bool,
    table: String,
}

#[allow(unused)]
struct ResolveNullConstraintViolation {
    failure: NullConstraintViolation,
}

static RETRY_COUNTERS: once_cell::sync::Lazy<dashmap::DashMap<PathBuf, Arc<u8>>> =
    once_cell::sync::Lazy::new(Default::default);

pub struct RetryManager;

pub struct DelayOutput {
    pub retry: u8,
    pub max: u8,
    pub duration: Duration,
}

impl RetryManager {
    pub fn reset() {
        RETRY_COUNTERS.clear();
    }

    pub fn clear_counter(key: &Path) {
        RETRY_COUNTERS.remove(key);
    }

    pub fn next_delay(key: &PathBuf) -> Option<DelayOutput> {
        let max_retries = 3;
        let delay = 3000;
        let compute_delay = |retry: u8| (retry as u64) * delay;
        match RETRY_COUNTERS.get(key) {
            Some(counter) => {
                let inc = *counter.as_ref() + 1;
                if inc <= max_retries {
                    RETRY_COUNTERS.insert(key.clone(), inc.into());
                    let ms = compute_delay(inc);
                    Some(DelayOutput {
                        retry: inc,
                        max: max_retries,
                        duration: Duration::from_millis(ms),
                    })
                } else {
                    None
                }
            }
            None => {
                let inc_init = 1;
                RETRY_COUNTERS.insert(key.clone(), inc_init.into());
                let ms = compute_delay(inc_init);
                Some(DelayOutput {
                    retry: inc_init,
                    max: max_retries,
                    duration: Duration::from_millis(ms),
                })
            }
        }
    }
}
