// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    policy::Policy,
    t::{self, TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{
            Effect, MaterializerDenoFunc, MaterializerDenoImport, MaterializerDenoPredefined,
        },
    },
    Result,
};

pub use super::ModuleImportOption as DenoImportOption;

#[derive(Debug)]
pub struct DenoRuntime {
    _id: RuntimeId,
}

impl DenoRuntime {
    pub fn new() -> Result<Self> {
        Ok(Self {
            _id: wasm::with_runtimes(|r, s| r.call_get_deno_runtime(s)),
        })
    }

    pub fn func<I, O>(&self, inp: I, out: O, options: DenoFuncOption) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let mat = MaterializerDenoFunc {
            code: options.code,
            secrets: options.secrets,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_register_deno_func(s, &mat, options.effect))?;

        t::funcb(inp, out, mat)
    }

    pub fn import<I, O>(&self, inp: I, out: O, options: DenoImportOption) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let mat = MaterializerDenoImport {
            func_name: options.func_name,
            module: options.module,
            deps: options.deps,
            secrets: options.secrets,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_import_deno_function(s, &mat, options.effect))?;

        t::funcb(inp, out, mat)
    }

    pub fn identity<I: TypeBuilder>(&self, inp: I) -> Result<TypeDef> {
        let mat = MaterializerDenoPredefined {
            name: "identity".to_string(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_get_predefined_deno_func(s, &mat))?;
        let inp = inp.build()?;

        t::funcb(inp.id(), inp.id(), mat)
    }

    pub fn policy(
        &self,
        name: &str,
        code: &str,
        secrets: impl IntoIterator<Item = impl ToString>,
    ) -> Result<Policy> {
        let mat = MaterializerDenoFunc {
            code: code.to_string(),
            secrets: secrets.into_iter().map(|s| s.to_string()).collect(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_register_deno_func(s, &mat, Effect::Read))?;

        Policy::create(name, mat)
    }

    pub fn import_policy(
        &self,
        name: Option<&str>,
        module: &str,
        func_name: &str,
        secrets: impl IntoIterator<Item = impl ToString>,
    ) -> Result<Policy> {
        let name = match name {
            Some(value) => value.to_string(),
            None => format!("__imp_{module}_{func_name}")
                .chars()
                .map(|ch| if ch.is_alphanumeric() { ch } else { '_' })
                .collect(),
        };

        let mat = MaterializerDenoImport {
            func_name: func_name.to_string(),
            module: module.to_string(),
            deps: Vec::default(),
            secrets: secrets.into_iter().map(|s| s.to_string()).collect(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_import_deno_function(s, &mat, Effect::Read))?;

        Policy::create(&name, mat)
    }

    // TODO
    // pub fn static(&self, ...) -> Result<TypeId> {}
}

#[derive(Debug, Default)]
pub struct DenoFuncOption {
    pub code: String,
    pub secrets: Vec<String>,
    pub effect: Effect,
}

impl DenoFuncOption {
    pub fn new(code: &str) -> Self {
        Self {
            code: code.to_string(),
            ..Default::default()
        }
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
