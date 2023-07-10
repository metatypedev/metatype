// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

use dashmap::{mapref::one::Ref, DashMap};
use macros::deno;
use once_cell::sync::Lazy;
use wasmedge_sdk::{params, Vm};

use super::{
    wasi_vm,
    wasmedge_sdk_bindgen::{Bindgen, Param},
};

static VIRTUAL_MACHINES: Lazy<DashMap<String, Vm>> = Lazy::new(DashMap::new);

fn get_virtual_machine(name: String) -> Result<Ref<'static, String, Vm>, String> {
    match VIRTUAL_MACHINES.get(&name) {
        Some(vm) => Ok(vm),
        None => Err("vm not initialized".to_string()),
    }
}

#[deno]
struct WasiVmInitConfig {
    vm_name: String,
    pylib_path: String,
    wasi_mod_path: String,
    preopens: Vec<String>,
}

#[deno]
enum WasiVmSetupOut {
    Ok,
    Err { message: String },
}

#[deno]
fn register_virtual_machine(config: WasiVmInitConfig) -> WasiVmSetupOut {
    if VIRTUAL_MACHINES.get(&config.vm_name).is_none() {
        let ret = wasi_vm::init_reactor_vm(
            config.preopens,
            PathBuf::from(config.pylib_path),
            PathBuf::from(config.wasi_mod_path),
        );
        if let Err(e) = ret {
            return WasiVmSetupOut::Err {
                message: e.to_string(),
            };
        }

        let vm = ret.unwrap();
        if let Err(e) = &vm.run_func(None, "init_python", params!()) {
            return WasiVmSetupOut::Err {
                message: e.to_string(),
            };
        }

        VIRTUAL_MACHINES.insert(config.vm_name, vm);
    }
    WasiVmSetupOut::Ok
}

#[deno]
struct WasiVmUnregisterInp {
    vm_name: String,
}

#[deno]
fn unregister_virtual_machine(input: WasiVmUnregisterInp) -> WasiVmSetupOut {
    match VIRTUAL_MACHINES.remove(&input.vm_name) {
        Some(_) => WasiVmSetupOut::Ok,
        None => WasiVmSetupOut::Err {
            message: format!(
                "Could not remove virtual machine {:?}: entry not found",
                input.vm_name
            ),
        },
    }
}

#[deno]
enum WasiReactorOut {
    Ok { res: String },
    Err { message: String },
}

#[deno]
struct PythonRegisterInp {
    vm: String,
    name: String,
    code: String,
}

#[deno]
struct PythonUnregisterInp {
    vm: String,
    name: String,
}

#[deno]
struct PythonApplyInp {
    vm: String,
    id: i32,
    name: String,
    /// stringified json array
    args: String,
}

fn run_wasi_func(vm: &Vm, fn_name: String, args: Vec<Param>) -> WasiReactorOut {
    let mut bg = Bindgen::new(vm.to_owned());
    match bg.run_wasm(fn_name, args) {
        Ok(ret) => {
            let ret = ret.unwrap().pop().unwrap().downcast::<String>().unwrap();
            WasiReactorOut::Ok {
                res: ret.as_ref().to_owned(),
            }
        }
        Err(e) => WasiReactorOut::Err {
            message: e.to_string(),
        },
    }
}

fn register_entity(wasi_fn_callee: String, entity: PythonRegisterInp) -> WasiReactorOut {
    let vm = get_virtual_machine(entity.vm);
    if let Err(message) = vm {
        return WasiReactorOut::Err { message };
    }
    let vm = vm.unwrap();
    let args = vec![Param::String(&entity.name), Param::String(&entity.code)];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

fn unregister_entity(wasi_fn_callee: String, entity: PythonUnregisterInp) -> WasiReactorOut {
    let vm = get_virtual_machine(entity.vm);
    if let Err(message) = vm {
        return WasiReactorOut::Err { message };
    }
    let vm = vm.unwrap();
    let args = vec![Param::String(&entity.name)];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

fn apply_entity(wasi_fn_callee: String, entity: PythonApplyInp) -> WasiReactorOut {
    let vm = get_virtual_machine(entity.vm);
    if let Err(message) = vm {
        return WasiReactorOut::Err { message };
    }
    let vm = vm.unwrap();
    let args = vec![
        Param::I32(entity.id),
        Param::String(&entity.name),
        Param::String(&entity.args),
    ];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

// deno bindings

// lambda

#[deno]
fn register_lambda(entity: PythonRegisterInp) -> WasiReactorOut {
    register_entity("register_lambda".to_string(), entity)
}

#[deno]
fn unregister_lambda(entity: PythonUnregisterInp) -> WasiReactorOut {
    unregister_entity("unregister_lambda".to_string(), entity)
}

#[deno]
fn apply_lambda(entity: PythonApplyInp) -> WasiReactorOut {
    apply_entity("apply_lambda".to_string(), entity)
}

// defun

#[deno]
fn register_def(entity: PythonRegisterInp) -> WasiReactorOut {
    register_entity("register_def".to_string(), entity)
}

#[deno]
fn unregister_def(entity: PythonUnregisterInp) -> WasiReactorOut {
    unregister_entity("unregister_def".to_string(), entity)
}

#[deno]
fn apply_def(entity: PythonApplyInp) -> WasiReactorOut {
    apply_entity("apply_def".to_string(), entity)
}

// module

#[deno]
fn register_module(entity: PythonRegisterInp) -> WasiReactorOut {
    register_entity("register_module".to_string(), entity)
}

#[deno]
fn unregister_module(entity: PythonUnregisterInp) -> WasiReactorOut {
    unregister_entity("unregister_module".to_string(), entity)
}
