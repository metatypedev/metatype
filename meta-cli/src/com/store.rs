// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::config::Config;
use common::node::BasicAuth;
use lazy_static::lazy_static;
use serde::Serialize;
use std::{
    borrow::{Borrow, BorrowMut},
    collections::HashMap,
    sync::Mutex,
};

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
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Command {
    Deploy,
    Undeploy,
    Serialize,
}

#[derive(Default, Clone, Debug)]
pub struct Endpoint {
    pub typegate: String,
    pub auth: Option<BasicAuth>,
}

#[derive(Default, Clone, Debug)]
pub struct ServerStore {
    config: Option<Config>,
    command: Option<Command>,
    secrets: HashMap<String, String>,
    endpoint: Endpoint,
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
}
