use regex::Regex;

use crate::{
    t::{self, TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{
            BaseMaterializer, Effect, MaterializerPythonDef, MaterializerPythonImport,
            MaterializerPythonLambda, MaterializerPythonModule,
        },
    },
    Result,
};

pub use super::ModuleImportOption as PythonImportOption;

#[derive(Debug)]
pub struct PythonRuntime {
    id: RuntimeId,
}

impl PythonRuntime {
    pub fn new() -> Result<Self> {
        let id = wasm::with_runtimes(|r, s| r.call_register_python_runtime(s))?;

        Ok(Self { id })
    }

    pub fn from_lambda<I, O>(&self, inp: I, out: O, code: &str) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: Effect::Read,
        };

        let mat = MaterializerPythonLambda {
            runtime: self.id,
            fn_: code.to_string(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_from_python_lambda(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn from_def<I, O>(&self, inp: I, out: O, code: &str) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let pattern = Regex::new(r"def\s+([A-Za-z0-9_]+)").unwrap();

        let Some(name) = pattern.find(code) else {
            return Err(format!("unable to extract def name from source code: {code}").into());
        };

        let base = BaseMaterializer {
            runtime: self.id,
            effect: Effect::Read,
        };

        let mat = MaterializerPythonDef {
            name: name.as_str().to_string(),
            runtime: self.id,
            fn_: code.to_string(),
        };

        let mat = wasm::with_runtimes(|r, s| r.call_from_python_def(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }

    pub fn import<I, O>(&self, inp: I, out: O, options: PythonImportOption) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: options.effect,
        };

        let mat_mod = MaterializerPythonModule {
            runtime: self.id,
            file: options.module,
            deps: options.deps,
        };

        let mat_mod = wasm::with_runtimes(|r, s| r.call_from_python_module(s, base, &mat_mod))?;

        let mat = MaterializerPythonImport {
            module: mat_mod,
            func_name: options.func_name,
            secrets: options.secrets,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_from_python_import(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }

    // TODO
    // substantial
}
