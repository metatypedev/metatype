// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::any::Any;

use anyhow::bail;
use anyhow::Result;
use macros::deno;

use base64::{engine::general_purpose, Engine as _};
use wasmedge_sdk::{
    config::{ConfigBuilder, HostRegistrationConfigOptions},
    dock::{Param, VmDock},
    Module, Vm,
};

#[deno]
struct WasiInput {
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

#[deno]
enum WasiOutput {
    Ok { res: String },
    Err { message: String },
}

#[deno]
fn wasmedge_wasi(input: WasiInput) -> WasiOutput {
    // https://github.com/second-state/wasmedge-rustsdk-examples

    let bytes = general_purpose::STANDARD
        .decode(input.wasm.as_bytes())
        .unwrap();
    let module = Module::from_bytes(None, bytes).unwrap();

    let config = ConfigBuilder::default()
        .with_host_registration_config(HostRegistrationConfigOptions::default().wasi(true))
        .build()
        .unwrap();
    let vm = Vm::new(Some(config))
        .unwrap()
        .register_module(None, module)
        .unwrap();

    let args: Vec<serde_json::Value> = input
        .args
        .iter()
        .map(|v| serde_json::from_str::<serde_json::Value>(v).unwrap())
        .collect();

    let params: Vec<Param> = args.iter().map(|v| value_to_param(v).unwrap()).collect();
    let vm = VmDock::new(vm);

    let run = vm.run_func(&input.func, params).unwrap();

    match run {
        Ok(mut res) => WasiOutput::Ok {
            res: param_cast(&input.out, &mut res).unwrap(),
        },
        Err(e) => WasiOutput::Err { message: e },
    }
}
