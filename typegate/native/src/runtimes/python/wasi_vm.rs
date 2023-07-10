// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;
use wasmedge_sdk::{
    config::{CommonConfigOptions, ConfigBuilder, HostRegistrationConfigOptions},
    error::HostFuncError,
    host_function, params, Caller, ImportObjectBuilder, Module, Vm, VmBuilder, WasmValue,
};

#[host_function]
pub fn callback(_caller: Caller, _args: Vec<WasmValue>) -> Result<Vec<WasmValue>, HostFuncError> {
    // println!("[host] callback");
    Ok(vec![])
}

pub fn init_reactor_vm(
    inp_preopens: Vec<String>,
    pythonlib_path: PathBuf,
    wasi_mod_path: PathBuf,
) -> anyhow::Result<Vm> {
    // start config
    let common_options = CommonConfigOptions::default().threads(true);
    let host_options = HostRegistrationConfigOptions::default().wasi(true);
    let config = ConfigBuilder::new(common_options)
        .with_host_registration_config(host_options)
        .build()?;
    // end config

    // load wasm module
    let module = Module::from_file(None, wasi_mod_path)?;

    // create an import module
    let imports = ImportObjectBuilder::new()
        .with_func::<(i32, i32), ()>("callback", callback)?
        .build("host")?;

    // [!] module order matters
    let mut vm = VmBuilder::new()
        .with_config(config)
        .build()?
        .register_import_module(imports)?
        .register_module(None, module)?;

    let wasi_module = vm.wasi_module_mut().unwrap();

    let mut preopens = vec![format!(
        "/usr/local/lib:{}:readonly",
        pythonlib_path.display()
    )];
    preopens.extend(inp_preopens);
    let preopens = preopens.iter().map(|s| &s[..]).collect();
    wasi_module.initialize(None, None, Some(preopens));

    println!("wasi_module: {:?}", wasi_module.exit_code());

    // if wasi-vfs is not used, initialize the reactor as not done automatically
    let _init = vm.run_func(None, "_initialize", params!())?;
    Ok(vm)
}
