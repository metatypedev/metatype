// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::Result;
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
#[rustfmt::skip]
use deno_core as deno_core;

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PythonExecutionInput {
    python_module_path: String,
    python_function_name: String,
    execution_context: Value,
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct PythonExecutionOutput {
    execution_result: Value,
    execution_status: String,
}

fn convert_json_to_python_object(py: Python, json_value: &Value) -> PyResult<PyObject> {
    match json_value {
        Value::Null => Ok(py.None()),
        Value::Bool(boolean_value) => Ok(boolean_value.into_py(py)),
        Value::Number(numeric_value) => {
            if let Some(integer_value) = numeric_value.as_i64() {
                Ok(integer_value.into_py(py))
            } else if let Some(float_value) = numeric_value.as_f64() {
                Ok(float_value.into_py(py))
            } else {
                Err(PyErr::new::<pyo3::exceptions::PyValueError, _>(
                    "Unsupported numeric type in JSON",
                ))
            }
        }
        Value::String(string_value) => Ok(string_value.into_py(py)),
        Value::Array(array_value) => {
            let python_list = pyo3::types::PyList::empty_bound(py);
            for item in array_value {
                python_list.append(convert_json_to_python_object(py, item)?)?;
            }
            Ok(python_list.into())
        }
        Value::Object(map_value) => {
            let python_dict = pyo3::types::PyDict::new_bound(py);
            for (key, value) in map_value {
                python_dict.set_item(key, convert_json_to_python_object(py, value)?)?;
            }
            Ok(python_dict.into())
        }
    }
}

pub fn execute_python_function(
    module_path: String,
    function_name: String,
    context: Value,
) -> Result<PyObject, PyErr> {
    Python::with_gil(|py| {
        let python_code = std::fs::read_to_string(module_path.clone())
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyIOError, _>(e.to_string()))?;

        let python_module =
            PyModule::from_code_bound(py, &python_code, &module_path, "dynamic_module")?;
        let python_function = python_module.getattr(function_name.as_str())?;

        let python_context = convert_json_to_python_object(py, &context)?;
        let execution_result = python_function.call1((python_context,))?;

        Ok(execution_result.into())
    })
}

#[deno_core::op2]
#[serde]
pub fn op_execute_python_with_context(
    #[serde] input: PythonExecutionInput,
) -> Result<PythonExecutionOutput> {
    let execution_result = execute_python_function(
        input.python_module_path,
        input.python_function_name,
        input.execution_context,
    )?;

    let result_value = Python::with_gil(|py| {
        let result_str = execution_result.clone_ref(py).to_string();
        serde_json::from_str(&result_str).unwrap_or(Value::Null)
    });

    Ok(PythonExecutionOutput {
        execution_result: result_value,
        execution_status: "SUCCESS".to_string(),
    })
}
