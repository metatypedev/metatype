// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use colored::Colorize;

use actix::prelude::*;
use anyhow::Result;
use serde::Deserialize;

use crate::com::{responses::SDKResponse, store::ServerStore};
use crate::deploy::actors::console::{Console, ConsoleActor};

use lazy_static::lazy_static;

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

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "reason")]
enum PushFailure {
    Unknown(GenericPushFailure),
    DatabaseResetRequired(DatabaseResetRequired),
    NullConstraintViolation(NullConstraintViolation),
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
struct DatabaseResetRequired {
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

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GenericPushFailure {
    message: String,
}

#[derive(Debug)]
#[allow(unused)]
pub struct PushResult {
    name: String,
    messages: Vec<MessageEntry>,
    migrations: Vec<Migrations>,
    failure: Option<PushFailure>,
    original_name: String,
    console: Addr<ConsoleActor>,
    sdk_response: SDKResponse,
}

impl PushResult {
    pub fn new(console: Addr<ConsoleActor>, sdk_response: SDKResponse) -> Result<Self> {
        let raw = sdk_response.as_push_result()?;

        let failure = match raw.failure {
            Some(failure) => Some(serde_json::from_str(&failure)?),
            None => None,
        };

        Ok(Self {
            name: raw.name,
            messages: raw.messages,
            migrations: raw.migrations,
            failure,
            original_name: sdk_response.typegraph_name.clone(),
            console,
            sdk_response,
        })
    }

    pub fn finalize(&self) -> Result<()> {
        let name = self.name.clone();
        self.console.info(format!(
            "{} Successfully pushed typegraph {name}.",
            "✓".green(),
            name = name.cyan()
        ));

        let migdir = ServerStore::get_config()
            .unwrap()
            .prisma_migrations_dir_rel(&self.original_name);

        for migrations in self.migrations.iter() {
            let dest = migdir.join(&migrations.runtime);
            // TODO async??
            if let Err(e) = common::archive::unpack(&dest, Some(migrations.migrations.clone())) {
                self.console.error(format!(
                    "Error while unpacking migrations into {:?}",
                    migdir
                ));
                self.console.error(format!("{e:?}"));
            } else {
                self.console.info(format!(
                    "Successfully unpacked migrations for {name}/{} at {:?}!",
                    migrations.runtime, dest
                ));
            }
        }

        if let Some(failure) = self.failure.clone() {
            match failure {
                PushFailure::Unknown(f) => {
                    self.console.error(format!(
                        "Unknown error while pushing typegraph {tg_name}",
                        tg_name = name.cyan(),
                    ));
                    self.console.error(f.message);
                }
                PushFailure::DatabaseResetRequired(failure) => {
                    todo!("database reset required {:?}", failure);
                }
                PushFailure::NullConstraintViolation(failure) => {
                    todo!("null constraint violation {:?}", failure);
                }
            }
        }
        Ok(())
    }
}

lazy_static! {
    static ref RETRY_COUNTERS: Mutex<HashMap<PathBuf, Arc<u8>>> = Mutex::new(HashMap::new());
}

pub struct RetryManager;

pub struct DelayOutput {
    pub retry: u8,
    pub max: u8,
    pub duration: Duration,
}

impl RetryManager {
    pub fn reset() {
        let mut counters = RETRY_COUNTERS.lock().unwrap();
        counters.clear();
    }

    pub fn clear_counter(key: &PathBuf) {
        let mut counters = RETRY_COUNTERS.lock().unwrap();
        counters.remove_entry(key);
    }

    pub fn next_delay(key: &PathBuf) -> Option<DelayOutput> {
        let mut counters = RETRY_COUNTERS.lock().unwrap();
        let max_retries = 3;
        let delay = 3000;
        let compute_delay = |retry: u8| (retry as u64) * delay;
        match counters.get(key) {
            Some(counter) => {
                let inc = *counter.as_ref() + 1;
                if inc <= max_retries {
                    counters.insert(key.clone(), inc.into());
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
                counters.insert(key.clone(), inc_init.into());
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
