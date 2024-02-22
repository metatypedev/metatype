// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::cell::RefCell;

use serde::Serialize;

use crate::config::Config;

thread_local! {
    pub static STORE: RefCell<ServerStore> = RefCell::new(ServerStore::default());
}

fn with_store<T, F: FnOnce(&ServerStore) -> T>(f: F) -> T {
    STORE.with(|s| f(&s.borrow()))
}

fn with_store_mut<T, F: FnOnce(&mut ServerStore) -> T>(f: F) -> T {
    STORE.with(|s| f(&mut s.borrow_mut()))
}

#[allow(dead_code)]
#[derive(Clone, Debug, Serialize)]
pub enum Command {
    Deploy,
    Undeploy,
    Serialize,
}

#[derive(Default, Clone, Debug)]
pub struct ServerStore {
    config: Option<Config>,
    command: Option<Command>,
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
}
