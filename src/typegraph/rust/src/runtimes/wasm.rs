use crate::{
    t::{self, TypeBuilder},
    wasm::{
        self,
        core::{RuntimeId, TypeId},
        runtimes::{BaseMaterializer, Effect, MaterializerWasmReflectedFunc, WasmRuntimeData},
    },
    Result,
};

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

    pub fn export<I, O>(&self, func_name: &str, inp: I, out: O, effect: Effect) -> Result<TypeId>
    where
        I: TypeBuilder,
        O: TypeBuilder,
    {
        let base = BaseMaterializer {
            runtime: self.id,
            effect,
        };

        let mat = MaterializerWasmReflectedFunc {
            func_name: func_name.to_string(),
        };

        let mat_id = wasm::with_runtimes(|r, s| r.call_from_wasm_reflected_func(s, base, &mat))?;

        t::func(inp, out, mat_id)?.build()
    }
}
