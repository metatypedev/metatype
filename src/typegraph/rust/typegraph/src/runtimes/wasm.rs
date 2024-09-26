use crate::{
    t::{self, TypeBuilder, TypeDef},
    wasm::{
        self,
        core::RuntimeId,
        runtimes::{
            BaseMaterializer, Effect, MaterializerWasmReflectedFunc, MaterializerWasmWireHandler,
            WasmRuntimeData,
        },
    },
    Result,
};

#[derive(Debug)]
pub struct WasmRuntimeWire {
    id: RuntimeId,
}

impl WasmRuntimeWire {
    pub fn new(artifact_path: &str) -> Result<Self> {
        let data = WasmRuntimeData {
            wasm_artifact: artifact_path.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_wasm_wire_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn handler<I, O>(&self, inp: I, out: O, options: WasmModuleOption) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: options.effect,
        };

        let mat = MaterializerWasmWireHandler {
            func_name: options.func_name,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_from_wasm_wire_handler(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }
}

#[derive(Debug)]
pub struct WasmRuntimeReflected {
    id: RuntimeId,
}

impl WasmRuntimeReflected {
    pub fn new(artifact_path: &str) -> Result<Self> {
        let data = WasmRuntimeData {
            wasm_artifact: artifact_path.to_string(),
        };

        let id = wasm::with_runtimes(|r, s| r.call_register_wasm_reflected_runtime(s, &data))?;

        Ok(Self { id })
    }

    pub fn export<I, O>(&self, inp: I, out: O, options: WasmModuleOption) -> Result<TypeDef>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect: options.effect,
        };

        let mat = MaterializerWasmReflectedFunc {
            func_name: options.func_name,
        };

        let mat = wasm::with_runtimes(|r, s| r.call_from_wasm_reflected_func(s, base, &mat))?;

        t::func(inp, out, mat)?.build()
    }
}

#[derive(Debug, Default)]
pub struct WasmModuleOption {
    pub func_name: String,
    pub effect: Effect,
}

impl WasmModuleOption {
    pub fn new(func_name: &str) -> Self {
        Self {
            func_name: func_name.to_string(),
            effect: Effect::Read,
        }
    }

    pub fn effect(mut self, effect: Effect) -> Self {
        self.effect = effect;
        self
    }
}
