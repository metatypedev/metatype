// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;

use std::sync::Mutex;
use std::time::Duration;

use actix::prelude::*;
use owo_colors::OwoColorize;
use serde::Deserialize;

use crate::com::{responses::SDKResponse, store::ServerStore};
use crate::deploy::actors::console::input::{Confirm, Select};
use crate::deploy::actors::console::{Console, ConsoleActor};
use crate::deploy::actors::loader::LoaderActor;
use crate::deploy::push::migration_resolution::{ManualResolution, RemoveLatestMigration};

use lazy_static::lazy_static;

use super::migration_resolution::{ConfirmDatabaseResetRequired, ForceReset};

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
    loader: Addr<LoaderActor>,
    sdk_response: SDKResponse,
}

impl PushResult {
    pub fn new(
        console: Addr<ConsoleActor>,
        loader: Addr<LoaderActor>,
        sdk_response: SDKResponse,
    ) -> Result<Self> {
        let raw = sdk_response
            .as_push_result()
            .wrap_err("SDK error pushing to typegate")?;

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
            loader,
            sdk_response,
        })
    }

    #[tracing::instrument]
    pub async fn finalize(&self) -> Result<()> {
        let name = self.name.clone();
        let print_failure = || {
            self.console.error(format!(
                "{} Error encountered while pushing {name}.",
                "✕".red(),
                name = name.cyan()
            ));
        };

        let print_success = || {
            self.console.info(format!(
                "{} Successfully pushed typegraph {name}.",
                "✓".green(),
                name = name.cyan()
            ));
        };

        // tg workdir + prisma_migration_rel
        let migdir = ServerStore::get_config()
            .unwrap()
            .prisma_migration_dir_abs(&self.original_name);

        for migrations in self.migrations.iter() {
            let dest = migdir.join(&migrations.runtime);
            if let Err(err) = common::archive::unpack(&dest, Some(migrations.migrations.clone())) {
                self.console.error(format!(
                    "error while unpacking migrations into {:?}",
                    migdir
                ));
                self.console.error(format!("{err:?}"));
            } else {
                self.console.info(format!(
                    "Successfully unpacked migrations for {name}/{} at {:?}",
                    migrations.runtime, dest
                ));
            }
        }

        if let Some(failure) = self.failure.clone() {
            print_failure();
            match failure {
                PushFailure::Unknown(fail) => {
                    self.console.error(format!(
                        "Unknown error while pushing typegraph {tg_name}\n{msg}",
                        tg_name = name.cyan(),
                        msg = fail.message
                    ));
                }
                PushFailure::DatabaseResetRequired(failure) => {
                    handle_database_reset(
                        self.console.clone(),
                        self.loader.clone(),
                        failure,
                        self.sdk_response.clone(),
                    )
                    .await?
                }
                PushFailure::NullConstraintViolation(failure) => {
                    handle_null_constraint_violation(
                        self.console.clone(),
                        self.loader.clone(),
                        failure,
                        self.sdk_response.clone(),
                        migdir.clone(),
                    )
                    .await?
                }
            }
        } else {
            print_success();
        }
        Ok(())
    }
}

// DatabaseReset Handler + interactivity

#[tracing::instrument]
async fn handle_database_reset(
    console: Addr<ConsoleActor>,
    loader: Addr<LoaderActor>,
    failure: DatabaseResetRequired,
    sdk_response: SDKResponse,
) -> Result<()> {
    let DatabaseResetRequired {
        message,
        runtime_name,
    } = failure;

    let name = sdk_response.typegraph_name.clone();

    console.error(message);
    console.warning(format!(
        "Database reset required for prisma runtime {rt} in typegraph {name}",
        rt = runtime_name.magenta(),
    ));

    let rt = runtime_name.clone();
    let _ = Confirm::new(
        console,
        format!("Do you want to reset the database for runtime {rt} on {name}?"),
    )
    .interact(Box::new(ConfirmDatabaseResetRequired {
        typegraph_path: sdk_response.typegraph_path,
        runtime_name,
        loader,
    }))
    .await?;

    Ok(())
}

// NullConstraintViolation Handler + interactivity

#[tracing::instrument]
pub async fn handle_null_constraint_violation(
    console: Addr<ConsoleActor>,
    loader: Addr<LoaderActor>,
    failure: NullConstraintViolation,
    sdk_response: SDKResponse,
    migration_dir: PathBuf,
) -> Result<()> {
    let NullConstraintViolation {
        message,
        runtime_name,
        migration_name,
        is_new_column,
        column,
        table,
    } = failure;

    console.error(message);

    if is_new_column {
        console.info(format!("manually edit the migration {migration_name}; or remove the migration and add set a default value"));

        let remove_latest = RemoveLatestMigration {
            loader: loader.clone(),
            typegraph_path: sdk_response.typegraph_path.clone(),
            migration_dir: migration_dir.clone(),
            runtime_name: runtime_name.clone(),
            migration_name: migration_name.clone(),
            console: console.clone(),
        };

        let manual = ManualResolution {
            loader: loader.clone(),
            typegraph_path: sdk_response.typegraph_path.clone(),
            migration_dir: migration_dir.clone(),
            runtime_name: runtime_name.clone(),
            migration_name: migration_name.clone(),
            message: Some(format!(
                "Set a default value for the column `{}` in the table `{}`",
                column, table
            )),
            console: console.clone(),
        };

        let reset = ForceReset {
            loader: loader.clone(),
            runtime_name: runtime_name.clone(),
            typegraph_path: sdk_response.typegraph_path.clone(),
        };

        let _ = Select::new(console, "Choose one of the following options".to_string())
            .interact(&[Box::new(remove_latest), Box::new(manual), Box::new(reset)])
            .await?;
    }

    Ok(())
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
