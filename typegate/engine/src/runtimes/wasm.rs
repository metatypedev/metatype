// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

use self::conversion::{
    unlift_type_to_default_value, value_to_wasmtime_val, wasmtime_val_to_value,
};
use std::env;

mod conversion;

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WasiInput {
    func: String,
    wasm: String,
    args: Vec<String>,
    #[allow(unused)]
    out: String,
}

#[deno_core::op2]
#[string]
pub fn op_wasmedge_wasi(#[serde] input: WasiInput) -> Result<String> {
    // https://github.com/second-state/wasmedge-rustsdk-examples

    let wasm_relative_path = PathBuf::from(input.wasm);
    let wasm_absolute_path = match env::current_dir() {
        Ok(cwd) => cwd.join(wasm_relative_path),
        Err(e) => return Err(anyhow::anyhow!(e)),
    };

    let args: Vec<serde_json::Value> = input
        .args
        .iter()
        .map(|v| serde_json::from_str::<serde_json::Value>(v).unwrap())
        .collect();

    let engine = wasmtime::Engine::default();
    let mut store = wasmtime::Store::new(&engine, ());

    let bytes = std::fs::read(wasm_absolute_path)?;
    let component = wasmtime::component::Component::new(&engine, bytes)?;
    let linker = wasmtime::component::Linker::new(&engine);

    let instance = linker.instantiate(&mut store, &component)?;

    let func = instance
        .get_func(&mut store, &input.func)
        .expect("exported function not found");

    // The user provided values must be coerced to the canonical parameters if possible
    // eg. Number can coerce to a u32, bool, f64
    let hint_params = func
        .params(&mut store)
        .iter()
        .map(|v| v.to_owned())
        .collect::<Vec<_>>();

    let params = args
        .iter()
        .enumerate()
        .map(|(pos, value)| value_to_wasmtime_val(value, hint_params.get(pos).cloned()))
        .collect::<Result<Vec<_>>>()?;

    let mut output = func
        .results(&mut store)
        .iter()
        .map(unlift_type_to_default_value)
        .collect::<anyhow::Result<Vec<_>>>()?;

    match func.call(&mut store, &params, &mut output) {
        Ok(()) => {
            let value = wasmtime_val_to_value(&output[0])?;
            serde_json::to_string(&value).map_err(|e| e.into())
        }
        Err(e) => Err(anyhow::anyhow!(e)),
    }
}
