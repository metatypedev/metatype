// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

use dashmap::{mapref::one::Ref, DashMap};
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

use std::path::PathBuf;
use wasmedge_sdk::dock::{Param, VmDock};
use wasmedge_sdk::{params, Vm};

use super::wasi_vm;

#[derive(Default)]
pub struct Ctx {
    vms: DashMap<String, Vm>,
}

impl Ctx {
    fn get_virtual_machine(&self, name: String) -> Result<Ref<'_, String, Vm>> {
        match self.vms.get(&name) {
            Some(vm) => Ok(vm),
            None => Err(anyhow::format_err!("vm not initialized")),
        }
    }
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WasiVmInitConfig {
    vm_name: String,
    pylib_path: String,
    wasi_mod_path: String,
    preopens: Vec<String>,
}

#[deno_core::op2]
pub fn op_register_virtual_machine(
    #[state] ctx: &mut Ctx,
    #[serde] config: WasiVmInitConfig,
) -> Result<()> {
    if ctx.vms.get(&config.vm_name).is_none() {
        let vm = wasi_vm::init_reactor_vm(
            config.preopens,
            PathBuf::from(config.pylib_path),
            PathBuf::from(config.wasi_mod_path),
        )?;

        vm.run_func(None, "init_python", params!())?;

        ctx.vms.insert(config.vm_name, vm);
    }
    Ok(())
}

#[deno_core::op2(fast)]
pub fn op_unregister_virtual_machine(
    #[state] ctx: &mut Ctx,
    #[string] vm_name: &str,
) -> Result<()> {
    match ctx.vms.remove(vm_name) {
        Some(_) => Ok(()),
        None => anyhow::bail!(
            "Could not remove virtual machine {:?}: entry not found",
            vm_name
        ),
    }
}

#[derive(Deserialize, Debug)]
#[serde(crate = "serde")]
pub struct PythonRegisterInp {
    vm: String,
    name: String,
    code: String,
}

#[derive(Deserialize, Debug)]
#[serde(crate = "serde")]
pub struct PythonUnregisterInp {
    vm: String,
    name: String,
}

#[derive(Deserialize, Debug)]
#[serde(crate = "serde")]
pub struct PythonApplyInp {
    vm: String,
    id: i32,
    name: String,
    /// stringified json array
    args: String,
}

fn run_wasi_func(vm: &Vm, fn_name: String, args: Vec<Param>) -> Result<String> {
    let vm_dock = VmDock::new(vm.to_owned());
    match vm_dock.run_func(fn_name, args) {
        Ok(ret) => {
            let ret = ret.unwrap().pop().unwrap().downcast::<String>().unwrap();
            Ok(ret.as_ref().to_owned())
        }
        Err(e) => anyhow::bail!(e),
    }
}

fn register_entity(ctx: &Ctx, wasi_fn_callee: String, entity: PythonRegisterInp) -> Result<String> {
    let vm = ctx.get_virtual_machine(entity.vm)?;
    let args = vec![Param::String(&entity.name), Param::String(&entity.code)];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

fn unregister_entity(
    ctx: &Ctx,
    wasi_fn_callee: String,
    entity: PythonUnregisterInp,
) -> Result<String> {
    let vm = ctx.get_virtual_machine(entity.vm)?;
    let args = vec![Param::String(&entity.name)];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

fn apply_entity(ctx: &Ctx, wasi_fn_callee: String, entity: PythonApplyInp) -> Result<String> {
    let vm = ctx.get_virtual_machine(entity.vm)?;
    let args = vec![
        Param::I32(entity.id),
        Param::String(&entity.name),
        Param::String(&entity.args),
    ];
    run_wasi_func(&vm, wasi_fn_callee, args)
}

// deno bindings

// lambda

#[deno_core::op2]
#[string]
pub fn op_register_lambda(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonRegisterInp,
) -> Result<String> {
    register_entity(ctx, "register_lambda".to_string(), entity)
}

#[deno_core::op2]
#[string]
pub fn op_unregister_lambda(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonUnregisterInp,
) -> Result<String> {
    unregister_entity(ctx, "unregister_lambda".to_string(), entity)
}

#[deno_core::op2]
#[string]
pub fn op_apply_lambda(#[state] ctx: &mut Ctx, #[serde] entity: PythonApplyInp) -> Result<String> {
    apply_entity(ctx, "apply_lambda".to_string(), entity)
}

// defun

#[deno_core::op2]
#[string]
pub fn op_register_def(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonRegisterInp,
) -> Result<String> {
    register_entity(ctx, "register_def".to_string(), entity)
}

#[deno_core::op2]
#[string]
pub fn op_unregister_def(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonUnregisterInp,
) -> Result<String> {
    unregister_entity(ctx, "unregister_def".to_string(), entity)
}

#[deno_core::op2]
#[string]
pub fn op_apply_def(#[state] ctx: &mut Ctx, #[serde] entity: PythonApplyInp) -> Result<String> {
    apply_entity(ctx, "apply_def".to_string(), entity)
}

// module

#[deno_core::op2]
#[string]
pub fn op_register_module(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonRegisterInp,
) -> Result<String> {
    register_entity(ctx, "register_module".to_string(), entity)
}

#[deno_core::op2]
#[string]
pub fn op_unregister_module(
    #[state] ctx: &mut Ctx,
    #[serde] entity: PythonUnregisterInp,
) -> Result<String> {
    unregister_entity(ctx, "unregister_module".to_string(), entity)
}
