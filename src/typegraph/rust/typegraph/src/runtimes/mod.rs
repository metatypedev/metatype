// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod deno;
pub mod graphql;
pub mod grpc;
pub mod http;
pub mod kv;
pub mod python;
pub mod random;
pub mod substantial;
pub mod wasm;

use crate::wasm::runtimes::Effect;

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}

#[derive(Debug, Default)]
pub struct ModuleImportOption {
    pub func_name: String,
    pub module: String,
    pub deps: Vec<String>,
    pub secrets: Vec<String>,
    pub effect: Effect,
}

impl ModuleImportOption {
    pub fn new(module: &str, func_name: &str) -> Self {
        Self {
            module: module.to_string(),
            func_name: func_name.to_string(),
            ..Default::default()
        }
    }

    pub fn deps(mut self, deps: impl IntoIterator<Item = impl ToString>) -> Self {
        self.deps = deps.into_iter().map(|s| s.to_string()).collect();
        self
    }

    pub fn secrets(mut self, secrets: impl IntoIterator<Item = impl ToString>) -> Self {
        self.secrets = secrets.into_iter().map(|s| s.to_string()).collect();
        self
    }

    pub fn effect(mut self, effect: Effect) -> Self {
        self.effect = effect;
        self
    }
}
