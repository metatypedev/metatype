#![cfg(test)]
// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::{fs, io};

use pyo3::prelude::*;

use crate::core::rustpy::*;
use crate::core::*;

fn read_script_file(module: &str) -> Result<String, io::Error> {
    fs::read_to_string(format!("./deno/python_scripts/{}.py", module))
}

struct PyModuleCall {
    callee: String,
    json_args: String,
    json_expect: String,
}

struct PyModuleSample {
    name: String,
    calls: Vec<PyModuleCall>,
}

pub fn init() {
    // Note:
    // python version in cargo.toml must correspond to host machine python version
    std::env::set_var("PYTHONPATH", "./deno/python_scripts");
    std::env::set_var("PYTHONDONTWRITEBYTECODE", "1");
    pyo3::append_to_inittab!(reactor);
    pyo3::append_to_inittab!(plugin);
    pyo3::prepare_freethreaded_python();

    Python::with_gil(|py| {
        let _module = py.import("plugin")?;
        Ok::<(), PyErr>(())
    })
    .unwrap();
}

#[test]
fn lambda_function() {
    init();
    let callee = "hellofn";
    let args = "[\"Jake\", 123]";
    let reg = lambda::register(
        callee.to_string(),
        "lambda x, y: f\"hello {x}{y}\"".to_string(),
    );
    assert!(reg.is_ok());
    assert_eq!(reg.unwrap(), "hellofn");

    let app = lambda::apply(callee.to_string(), args.to_string());
    assert!(app.is_ok());
    assert_eq!(app.unwrap(), "\"hello Jake123\"");

    let unreg = lambda::unregister(callee.to_string());
    assert!(unreg.is_ok());
}

#[test]
fn def_function() {
    init();
    let module = "defun";
    let callee = "concat_two";
    let args = "[1, \"two\"]";
    match read_script_file(module) {
        Ok(code) => {
            let reg = defun::register(callee.to_string(), code);
            assert!(reg.is_ok());
            assert_eq!(reg.unwrap(), callee);

            let app = defun::apply(callee.to_string(), args.to_string());
            assert!(app.is_ok());
            assert_eq!(app.unwrap(), "\"1two\"");

            let unreg = defun::unregister(callee.to_string());
            assert!(unreg.is_ok());
            assert_eq!(unreg.unwrap(), callee);
        }
        Err(e) => {
            panic!("here {:?}", e);
        }
    }
}

#[test]
fn module_import() {
    init();
    let samples = vec![
        PyModuleSample {
            name: "module_a".to_string(),
            calls: vec![
                PyModuleCall {
                    callee: "module_a.even".to_string(),
                    json_args: "[-456]".to_string(),
                    json_expect: "true".to_string(),
                },
                PyModuleCall {
                    callee: "module_a.odd".to_string(),
                    json_args: "[-456]".to_string(),
                    json_expect: "false".to_string(),
                },
            ],
        },
        PyModuleSample {
            name: "module_b".to_string(),
            calls: vec![PyModuleCall {
                callee: "module_b.hello".to_string(),
                json_args: "[]".to_string(),
                json_expect: "\"hello from  module_b\"".to_string(),
            }],
        },
    ];

    // register
    for md in &samples {
        match read_script_file(&md.name) {
            Ok(code) => {
                let reg = module::register(md.name.clone(), code);
                assert!(reg.is_ok());
                assert_eq!(reg.unwrap(), md.name.clone());
            }
            Err(e) => {
                panic!("{:?}", e);
            }
        }
    }

    // calls
    for md in &samples {
        for call in &md.calls {
            let app = defun::apply(call.callee.clone(), call.json_args.clone());
            assert!(app.is_ok());
            assert_eq!(app.unwrap(), call.json_expect);
        }
    }

    // unregister
    for md in &samples {
        let app = module::unregister(md.name.clone());
        assert!(app.is_ok());
    }
}

#[test]
fn cross_module_call() {
    init();
    let samples = &[
        &["mod_a", "mod_a.A", "def A():\n\treturn \"From A!\""],
        &["mod_b", "mod_b.B", "import mod_a\n\nB = lambda: mod_a.A()"],
        &[
            "main",
            "main.C",
            "from mod_b import B\n\ndef C():\n\treturn B()",
        ],
    ];

    // register
    for sample in samples {
        let [md, _, code] = sample;
        let reg = module::register(md.to_string(), code.to_string());
        assert!(reg.is_ok());
        assert_eq!(reg.unwrap(), md.to_string().clone());
    }

    // call main.C > mod_b.B > mod_a.A
    let [_, callee_c, _] = samples[2];
    let app = defun::apply(callee_c.to_string(), "[]".to_string());
    assert!(app.is_ok());
    assert_eq!(app.unwrap(), "\"From A!\"");
}

#[test]
fn bindfn_should_never_panic() {
    init();

    assert!(lambda::unregister("non_existent".to_string()).is_err());
    assert!(defun::unregister("non_existent".to_string()).is_err());
    assert!(module::unregister("non_existent".to_string()).is_err());

    assert!(defun::apply("non_existent".to_string(), "invalid json".to_string()).is_err());
    assert!(lambda::apply("non_existent".to_string(), "invalid json".to_string()).is_err());
    assert!(lambda::apply("non_existent".to_string(), "invalid json".to_string()).is_err());

    assert!(defun::register("".to_string(), "invalid python".to_string()).is_err());
    assert!(lambda::register("".to_string(), "invalid python".to_string()).is_err());
    assert!(lambda::register("".to_string(), "invalid python".to_string()).is_err());
}
