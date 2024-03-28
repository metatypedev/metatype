// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use pyo3::prelude::*;

use crate::core::common::*;

pub fn register(name: String, code: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let module = py.import("plugin")?;
        let func = PyModule::from_code(py, &code, "", "")?.getattr(&*name)?;
        module.add(&name, func)?;
        Ok::<String, PyErr>(name)
    })
    .map_err(|e| e.to_string())
}

pub fn unregister(name: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let module = py.import("plugin")?;
        module.delattr(&*name)?;
        Ok::<String, PyErr>(name)
    })
    .map_err(|e| e.to_string())
}

pub fn apply(name: String, args: String) -> Result<String, String> {
    let ret = collect_args_from_json(&args)
        .map_err(|e| e.to_string())
        .and_then(|pyargs| {
            Python::with_gil(|py| {
                let module = py.import("plugin")?;
                let native = pythonize_args(py, pyargs);
                let pyret = recurse_dot_attr(module, name)?.call1(native)?;
                let json: serde_json::Value = pythonize::depythonize(pyret)?;
                Ok::<serde_json::Value, PyErr>(json)
            })
            .map_err(|e| e.to_string())
        })
        .map(|pyret| pyret.to_string());
    ret
}
