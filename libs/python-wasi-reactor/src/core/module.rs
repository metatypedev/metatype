// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use pyo3::prelude::*;

pub fn register(name: String, code: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let module = py.import("plugin")?;
        let filename = name.clone() + ".py";
        let imp_module = PyModule::from_code(py, &code, &filename, &name)?;
        module.add_submodule(imp_module)?;
        // module.add(&name, imp_module)?;
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
