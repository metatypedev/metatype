// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use pyo3::{prelude::*, types::PyDict};

#[pyfunction]
pub fn reverse(str: String) -> PyResult<String> {
    println!("reverse: {}", str);
    Ok(str.chars().rev().collect::<String>())
}

#[pymodule]
pub fn reactor(_py: Python<'_>, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(reverse, m)?)?;
    Ok(())
}

#[pymodule]
pub fn plugin(py: Python<'_>, m: &PyModule) -> PyResult<()> {
    m.add("lambdas", PyDict::new(py))?;
    Ok(())
}
