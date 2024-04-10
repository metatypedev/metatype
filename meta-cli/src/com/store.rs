// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{config::Config, secrets::Secrets};
use anyhow::{bail, Result};
use common::node::BasicAuth;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::{
    borrow::{Borrow, BorrowMut},
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use super::responses::SDKResponse;

lazy_static! {
    #[derive(Debug)]
    pub static ref STORE: Mutex<ServerStore> = Mutex::new(Default::default());
}

fn with_store<T, F: FnOnce(&ServerStore) -> T>(f: F) -> T {
    let guard = STORE.lock().unwrap();
    f(guard.borrow())
}

fn with_store_mut<T, F: FnOnce(&mut ServerStore) -> T>(f: F) -> T {
    let mut guard = STORE.lock().unwrap();
    f(guard.borrow_mut())
}

#[allow(dead_code)]
#[derive(Serialize, Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Command {
    Deploy,
    Serialize,
    Codegen,
}

#[derive(Default, Clone, Debug)]
pub struct Endpoint {
    pub typegate: String,
    pub auth: Option<BasicAuth>,
}

#[derive(Default, Serialize, Clone, Debug)]
pub struct MigrationAction {
    pub reset: bool,
    pub create: bool,
}

#[derive(Default, Serialize, Clone, Debug)]
pub struct RuntimeMigrationAction {
    pub runtime_name: String,
    pub action: MigrationAction,
}

#[derive(Default, Debug)]
pub struct ServerStore {
    config: Option<Config>,
    command: Option<Command>,
    /// default (all)
    migration_action_glob: MigrationAction,
    /// 1 typegraph => n runtimes
    migration_action: HashMap<PathBuf, Arc<Vec<RuntimeMigrationAction>>>,
    secrets: Secrets,
    endpoint: Endpoint,
    prefix: Option<String>,
    sdk_responses: HashMap<PathBuf, Arc<HashMap<String, SDKResponse>>>,
    artifact_resolution: Option<bool>,
    codegen: Option<bool>,
}

#[allow(dead_code)]
impl ServerStore {
    pub fn with(command: Option<Command>, config: Option<Config>) {
        with_store_mut(|s| {
            s.config = config;
            s.command = command;
        })
    }

    pub fn set_config(config: Config) {
        with_store_mut(|s| s.config = Some(config))
    }

    pub fn get_config() -> Option<Config> {
        with_store(|s| s.config.to_owned())
    }

    pub fn get_command() -> Option<Command> {
        with_store(|s| s.command.clone())
    }

    pub fn set_secrets(secrets: Secrets) {
        with_store_mut(|s| s.secrets = secrets)
    }

    pub fn get_secrets(tg_name: &str) -> HashMap<String, String> {
        with_store(|s| s.secrets.get(tg_name))
    }

    pub fn set_endpoint(endpoint: Endpoint) {
        with_store_mut(|s| s.endpoint = endpoint)
    }

    pub fn get_endpoint() -> Endpoint {
        with_store(|s| s.endpoint.clone())
    }

    pub fn add_response(response: SDKResponse) {
        with_store_mut(|s| {
            let mut name_to_res = s
                .sdk_responses
                .get(&response.typegraph_path)
                .map(|v| v.as_ref().to_owned())
                .unwrap_or_default();

            name_to_res.insert(response.typegraph_name.clone(), response.clone());

            s.sdk_responses
                .insert(response.typegraph_path.clone(), name_to_res.into());
        })
    }

    pub fn get_responses(tg_path: &PathBuf) -> Option<Arc<HashMap<String, SDKResponse>>> {
        with_store(|s| s.sdk_responses.get(tg_path).map(|v| v.to_owned()))
    }

    pub fn get_responses_or_fail(tg_path: &PathBuf) -> Result<Arc<HashMap<String, SDKResponse>>> {
        match Self::get_responses(tg_path) {
            Some(res) => Ok(res.to_owned()),
            None => bail!("Invalid state, no response was sent by {:?}, this could be the result of an outdated sdk", &tg_path),
        }
    }

    pub fn set_migration_action_glob(option: MigrationAction) {
        with_store_mut(|s| s.migration_action_glob = option)
    }

    pub fn get_migration_action_glob() -> MigrationAction {
        with_store(|s| s.migration_action_glob.to_owned())
    }

    pub fn set_migration_action(tg_path: PathBuf, rt_migration: RuntimeMigrationAction) {
        with_store_mut(|s| {
            let mut items = vec![];
            if let Some(actions) = s.migration_action.get(&tg_path) {
                items = actions.as_ref().clone();
            }
            // remove previous rt action if any
            items.retain(|v| v.runtime_name.ne(&rt_migration.runtime_name));
            items.push(rt_migration);
            s.migration_action.insert(tg_path, items.into());
        })
    }

    pub fn get_per_runtime_migration_action(
        tg_path: &PathBuf,
    ) -> Option<Vec<RuntimeMigrationAction>> {
        with_store(|s| {
            if let Some(mig_action) = s.migration_action.get(tg_path) {
                println!(
                    "Specific migration action was defined for {}",
                    tg_path.display()
                );
                return Some(mig_action.as_ref().to_owned());
            }
            None
        })
    }

    pub fn set_prefix(prefix: Option<String>) {
        with_store_mut(|s| s.prefix = prefix)
    }

    pub fn get_prefix() -> Option<String> {
        with_store(|s| s.prefix.to_owned())
    }

    pub fn set_artifact_resolution_flag(value: bool) {
        with_store_mut(|s| s.artifact_resolution = Some(value))
    }

    /// true by default
    pub fn get_artifact_resolution_flag() -> bool {
        with_store(|s| s.artifact_resolution.unwrap_or(true))
    }

    pub fn set_codegen_flag(value: bool) {
        with_store_mut(|s| s.codegen = Some(value))
    }

    pub fn get_codegen_flag() -> bool {
        with_store(|s| s.codegen.unwrap_or(false))
    }
}
