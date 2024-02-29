// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::Config;
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
    UnpackMigration,
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

#[derive(Default, Debug)]
pub struct ServerStore {
    config: Option<Config>,
    command: Option<Command>,
    migration_action: MigrationAction,
    secrets: HashMap<String, String>,
    endpoint: Endpoint,
    prefix: Option<String>,
    sdk_responses: HashMap<PathBuf, Arc<SDKResponse>>,
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

    pub fn set_secrets(secrets: HashMap<String, String>) {
        with_store_mut(|s| s.secrets = secrets)
    }

    pub fn get_secrets() -> HashMap<String, String> {
        with_store(|s| s.secrets.clone())
    }

    pub fn set_endpoint(endpoint: Endpoint) {
        with_store_mut(|s| s.endpoint = endpoint)
    }

    pub fn get_endpoint() -> Endpoint {
        with_store(|s| s.endpoint.clone())
    }

    pub fn add_response(tg_name: PathBuf, response: SDKResponse) {
        with_store_mut(|s| {
            s.sdk_responses.insert(tg_name, Arc::new(response));
        })
    }

    pub fn get_response(tg_path: &PathBuf) -> Option<Arc<SDKResponse>> {
        with_store(|s| s.sdk_responses.get(tg_path).map(|v| v.to_owned()))
    }

    pub fn get_response_or_fail(tg_path: &PathBuf) -> Result<Arc<SDKResponse>> {
        match Self::get_response(tg_path) {
            Some(res) => Ok(res.to_owned()),
            None => bail!("Invalid state, no response was sent by {:?}", &tg_path),
        }
    }

    pub fn get_responses() -> HashMap<PathBuf, Arc<SDKResponse>> {
        with_store(|s| s.sdk_responses.clone())
    }

    pub fn set_migration_action(option: MigrationAction) {
        with_store_mut(|s| s.migration_action = option)
    }

    pub fn get_migration_action() -> MigrationAction {
        with_store(|s| s.migration_action.to_owned())
    }

    pub fn set_prefix(prefix: Option<String>) {
        with_store_mut(|s| s.prefix = prefix)
    }

    pub fn get_prefix() -> Option<String> {
        with_store(|s| s.prefix.to_owned())
    }
}
