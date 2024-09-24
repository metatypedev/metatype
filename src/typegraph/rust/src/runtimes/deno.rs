use crate::{
    policy::Policy,
    t::{self, TypeBuilder},
    wasm::{
        self,
        core::{RuntimeId, TypeId},
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

    pub fn func<I, O>(&self, inp: I, out: O, options: DenoFuncOption) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let mat = MaterializerDenoFunc {
            code: options.code,
            secrets: options.secrets,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_register_deno_func(s, &mat, options.effect))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn import<I, O>(&self, inp: I, out: O, options: DenoImportOption) -> Result<TypeId>
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

        t::func(inp, out, mat)?.build()
    }

    pub fn identity<I>(&self, inp: I) -> Result<TypeId>
    where
        I: TypeBuilder + Clone,
    {
        let mat = MaterializerDenoPredefined {
            name: "identity".to_string(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_get_predefined_deno_func(s, &mat))?;

        t::func(inp.clone(), inp, mat)?.build()
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

        Policy::new(name, mat)
    }

    pub fn import_policy(
        &self,
        name: &str, // TODO: make it optional
        module: &str,
        func_name: &str,
        secrets: impl IntoIterator<Item = impl ToString>,
    ) -> Result<Policy> {
        let mat = MaterializerDenoImport {
            func_name: func_name.to_string(),
            module: module.to_string(),
            deps: Vec::default(),
            secrets: secrets.into_iter().map(|s| s.to_string()).collect(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_import_deno_function(s, &mat, Effect::Read))?;

        Policy::new(name, mat)
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
