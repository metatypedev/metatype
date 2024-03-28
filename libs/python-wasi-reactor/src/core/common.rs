// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use pyo3::prelude::*;
use pyo3::types::PyTuple;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum Tag {
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "err")]
    Err,
}

#[derive(Serialize, Deserialize)]
pub struct RetValue {
    pub value: String,
    pub tag: Tag,
}

pub fn collect_args_from_json(args_str: &str) -> Result<Vec<serde_json::Value>, String> {
    let args = serde_json::from_str::<serde_json::Value>(args_str).map_err(|e| e.to_string())?;
    if args.is_array() {
        let res = match args.as_array() {
            Some(arr) => arr.to_vec(),
            None => vec![],
        };
        Ok(res)
    } else {
        Err("string must be a json array".to_string())
    }
}

pub fn pythonize_args(py: Python, pyargs: Vec<serde_json::Value>) -> &PyTuple {
    let eval_args = pyargs
        .iter()
        .map(|value| pythonize::pythonize(py, value).unwrap());
    PyTuple::new(py, eval_args)
}

pub fn recurse_dot_attr(py: &PyModule, name: String) -> PyResult<&PyAny> {
    let parts = name.split('.');
    let mut curr: &PyAny = py;
    for sub in parts {
        curr = curr.getattr(sub)?;
    }
    Ok(curr)
}
