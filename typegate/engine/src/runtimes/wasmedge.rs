// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use std::any::Any;

use anyhow::bail;

#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

use once_cell::sync::OnceCell;
use wasmedge_sdk::config::CommonConfigOptions;
use wasmedge_sdk::error::HostFuncError;
use wasmedge_sdk::{
    config::{ConfigBuilder, HostRegistrationConfigOptions},
    dock::{Param, VmDock},
    params, Module,
};
use wasmedge_sdk::{
    host_function, Caller, ImportObject, ImportObjectBuilder, NeverType, VmBuilder, WasmValue,
};

use std::{env, fs};

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WasiInput {
    func: String,
    wasm: String,
    args: Vec<String>,
    out: String,
}

fn value_to_param(value: &'_ serde_json::Value) -> Result<Param<'_>> {
    use serde_json::Value::*;
    let p = match value {
        Null => bail!("null not supported yet"),
        Bool(v) => Param::Bool(*v),
        Number(v) => Param::F64(v.as_f64().unwrap()),
        String(v) => Param::String(v.as_str()),
        Array(_) => bail!("Array not supported yet"),
        Object(_) => bail!("object not supported yet"),
    };
    Ok(p)
}

fn param_cast(out: &str, res: &mut Vec<Box<dyn Any + Send + Sync>>) -> Result<String> {
    let json = match out {
        "number" => serde_json::to_string(&res.pop().unwrap().downcast::<f64>().unwrap())?,
        "integer" => serde_json::to_string(&res.pop().unwrap().downcast::<i64>().unwrap())?,
        _ => bail!("type {} not supported yet", out),
    };
    Ok(json)
}

fn load_wasm_module_any_ext<P: AsRef<Path>>(wasm_relative_path: P) -> Result<Module> {
    let wasm_absolute_path = match env::current_dir() {
        Ok(cwd) => cwd.join(wasm_relative_path),
        Err(e) => return Err(anyhow::anyhow!(e)),
    };
    let bytes = fs::read(wasm_absolute_path)?;
    Module::from_bytes(None, bytes).map_err(|e| e.into())
}

#[deno_core::op2]
#[string]
pub fn op_wasmedge_wasi(#[serde] input: WasiInput) -> Result<String> {
    // https://github.com/second-state/wasmedge-rustsdk-examples

    let module = load_wasm_module_any_ext(input.wasm)?;

    let config = ConfigBuilder::default()
        .with_host_registration_config(HostRegistrationConfigOptions::default().wasi(true))
        .build()
        .unwrap();
    let vm = VmBuilder::new()
        .with_config(config)
        .build()?
        .register_module(None, module)?;

    let args: Vec<serde_json::Value> = input
        .args
        .iter()
        .map(|v| serde_json::from_str::<serde_json::Value>(v).unwrap())
        .collect();

    let params: Vec<Param> = args.iter().map(|v| value_to_param(v).unwrap()).collect();
    let vm = VmDock::new(vm);

    let run = vm.run_func(&input.func, params)?;

    match run {
        Ok(mut res) => Ok(param_cast(&input.out, &mut res).unwrap()),
        Err(e) => Err(anyhow::anyhow!(e)),
    }
}

static IMPORTS: OnceCell<ImportObject<NeverType>> = OnceCell::new();

#[host_function]
pub fn gql_host_impl(
    _caller: Caller,
    _args: Vec<WasmValue>,
) -> Result<Vec<WasmValue>, HostFuncError> {
    todo!("graphql call");
}

pub fn get_or_init_imports() -> anyhow::Result<&'static ImportObject<NeverType>> {
    let import = ImportObjectBuilder::new()
        .with_func::<(i32, i32), (), NeverType>("gql_host_impl", gql_host_impl, None)?
        .build::<NeverType>("host", None)?;
    Ok(IMPORTS.get_or_init(|| import))
}

#[deno_core::op2]
#[string]
pub fn op_wasmedge_mdk(#[serde] input: WasiInput) -> Result<String> {
    // setup vm
    let common_options = CommonConfigOptions::default().threads(true);
    let host_options = HostRegistrationConfigOptions::default().wasi(true);
    let config = ConfigBuilder::new(common_options)
        .with_host_registration_config(host_options)
        .build()?;

    let mut vm = VmBuilder::new().with_config(config).build()?;
    vm.register_import_module(get_or_init_imports()?)?; // link host function

    let mdk_module = load_wasm_module_any_ext(input.wasm)?;
    let vm = vm.register_module(None, mdk_module)?;

    // do fn calls
    vm.run_func(None, "init", params!())?; // init_mdk!()

    let args: Vec<serde_json::Value> = input
        .args
        .iter()
        .map(|v| serde_json::from_str::<serde_json::Value>(v).unwrap())
        .collect();

    let params: Vec<Param> = args.iter().map(|v| value_to_param(v).unwrap()).collect();
    let vm_dock = VmDock::new(vm);

    // TODO: explore why wit-bindgen not working out of box on wasmedge?
    // Their solution: https://github.com/second-state/witc
    // match vm_dock.run_func(&format!("metatype:mdk/mat#{}", input.func), params)? {
    match vm_dock.run_func(&input.func, params)? {
        Ok(mut res) => Ok(param_cast(&input.out, &mut res).unwrap()),
        Err(e) => Err(anyhow::anyhow!(e)),
    }
}
