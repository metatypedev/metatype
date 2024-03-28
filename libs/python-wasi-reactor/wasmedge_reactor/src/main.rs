// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod wasi_vm;

use std::path::PathBuf;

use wasmedge_sdk::{
    dock::{Param, VmDock},
    params,
};

fn main() -> anyhow::Result<()> {
    let preopens = vec!["/app:./src/python:readonly".to_owned()];
    let pylib = PathBuf::from("./vendor/libpython/usr/local/lib");
    let wasi_mod = PathBuf::from("./build/python-wasi-reactor.wasm");
    let vm = wasi_vm::init_reactor_vm(preopens, pylib, wasi_mod)?;

    println!("\n-----------------");
    vm.run_func(None, "init_python", params!())?;

    let dock: VmDock = VmDock::new(vm);

    // basic test
    dock.run_func("identity", vec![Param::String("hello identity from guest")])
        .and_then(|rv| {
            let ret = rv.unwrap().pop().unwrap().downcast::<String>().unwrap();
            println!("Run bindgen -- identity {:?}", ret);
            Ok(())
        })?;

    let args = vec![
        Param::String("say_hello"),
        Param::String("lambda name: f\"Hello {name}\""),
    ];
    dock.run_func("register_lambda", args).and_then(|rv| {
        let ret = rv.unwrap().pop().unwrap().downcast::<String>().unwrap();
        println!("Run bindgen -- register_lambda {:?}", ret);
        Ok(())
    })?;

    let args = vec![
        Param::String("1"),
        Param::String("say_hello"),
        Param::String("[\"Jake\"]"),
    ];
    dock.run_func("apply_lambda", args).and_then(|rv| {
        let ret = rv.unwrap().pop().unwrap().downcast::<String>().unwrap();
        println!("Run bindgen -- apply_lambda {}", ret);
        Ok(())
    })?;
    Ok(())
}
