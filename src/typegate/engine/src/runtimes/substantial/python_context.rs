// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use anyhow::{bail, Result};
// use common::graphql::Query;
use pyo3::{exceptions::PyException, prelude::*};
use reqwest::{Client, Method, Request, RequestBuilder, Url};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, str::FromStr};
#[rustfmt::skip]
use deno_core as deno_core;

use chrono::{TimeZone, Utc};

use substantial::converters::{Interupt, Operation, OperationEvent, Run, SaveOutput, SavedValue};

trait ToPyObject {
    fn to_object(&self, python: Python) -> PyObject;
}

impl ToPyObject for Value {
    fn to_object(&self, py: Python) -> PyObject {
        match self {
            Value::Null => py.None(),
            Value::Bool(b) => b.into_py(py),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    i.into_py(py)
                } else if let Some(f) = n.as_f64() {
                    f.into_py(py)
                } else {
                    n.to_string().into_py(py)
                }
            }
            Value::String(s) => s.into_py(py),
            Value::Array(arr) => arr
                .iter()
                .map(|v| v.to_object(py))
                .collect::<Vec<PyObject>>()
                .into_py(py),
            Value::Object(map) => {
                let dict = pyo3::types::PyDict::new_bound(py);
                for (k, v) in map {
                    dict.set_item(k, v.to_object(py)).unwrap();
                }
                dict.into_py(py)
            }
        }
    }
}

#[derive(Deserialize)]
struct Context;

#[derive(Deserialize)]
struct Meta {
    url: String,
    token: String,
}

#[derive(Deserialize)]
struct TaskContext {
    #[allow(dead_code)]
    parent: Option<HashMap<String, Value>>,
    #[allow(dead_code)]
    context: Option<Context>,
    #[allow(dead_code)]
    secrets: HashMap<String, String>,
    meta: Meta,
    #[allow(dead_code)]
    headers: HashMap<String, String>,
}

fn create_gql_client(internal: TaskContext) -> Result<RequestBuilder> {
    let url = Url::from_str(&internal.meta.url)?;
    let request = Request::new(Method::POST, url);
    let gql_client =
        RequestBuilder::from_parts(Client::new(), request).bearer_auth(internal.meta.token);

    Ok(gql_client)
}

#[derive(Clone, Debug)]
enum Strategy {
    #[allow(dead_code)]
    Linear,
}

#[pyclass(frozen)]
#[derive(Clone)]
struct Retry {
    strategy: Option<Strategy>,
    min_backoff_ms: i32,
    max_backoff_ms: i32,
    max_retries: i32,
}

struct RetryStrategy {
    min_backoff_ms: Option<i32>,
    max_backoff_ms: Option<i32>,
    max_retries: i32,
}

impl RetryStrategy {
    fn new(
        max_retries: i32,
        min_backoff_ms: Option<i32>,
        max_backoff_ms: Option<i32>,
    ) -> Result<Self> {
        if max_retries < 1 {
            bail!("max_retries < 1".to_string());
        }

        let mut strategy = RetryStrategy {
            min_backoff_ms,
            max_backoff_ms,
            max_retries,
        };

        let low = strategy.min_backoff_ms;
        let high = strategy.max_backoff_ms;
        if let (Some(low), Some(high)) = (low, high) {
            if low >= high {
                bail!("min_backoff_ms >= max_backoff_ms".to_string());
            }
            if low < 0 {
                bail!("min_backoff_ms < 0".to_string());
            }
        } else if low.is_some() && high.is_none() {
            strategy.max_backoff_ms = Some(low.unwrap() + 10);
        } else if low.is_none() && high.is_some() {
            strategy.min_backoff_ms = Some(high.unwrap().saturating_sub(10));
        }

        Ok(strategy)
    }

    fn eval(&self, strategy: Strategy, retries_left: i32) -> Result<i32> {
        match strategy {
            Strategy::Linear => Ok(self.linear(retries_left)?),
        }
    }

    fn linear(&self, retries_left: i32) -> Result<i32> {
        if retries_left <= 0_i32 {
            bail!("retries left <= 0");
        }

        let dt = self.max_backoff_ms.unwrap_or(0) - self.min_backoff_ms.unwrap_or(0);
        Ok(((self.max_retries - retries_left) * dt) / self.max_retries)
    }
}

#[pyclass(frozen)]
#[derive(Clone)]
struct Save {
    #[allow(dead_code)]
    timeout_ms: Option<String>,
    retry: Option<Retry>,
}

#[pymethods]
impl Save {
    #[getter]
    fn get_retry(&self) -> Option<Retry> {
        self.retry.clone()
    }
}

#[pyclass]
struct PythonContext {
    #[allow(dead_code)]
    query: RequestBuilder,
    run: Run,
    #[allow(dead_code)]
    kwargs: HashMap<String, Value>,
}

#[pymethods]
impl PythonContext {
    #[pyo3(signature = (func, option = None))]
    fn save(&mut self, py: Python, func: PyObject, option: Option<Py<Save>>) -> PyResult<String> {
        let SaveOutput {
            payload,
            current_retry_count,
        } = self
            .run
            .save()
            .map_err(|e| PyException::new_err(e.to_string()))?;

        if let Some(payload) = payload {
            return Ok(payload.to_string());
        }

        let current_retry_count = current_retry_count.unwrap_or(1);

        match func.call0(py) {
            Ok(result) => {
                let op = OperationEvent::Save {
                    id: self.run.id,
                    value: SavedValue::Resolved {
                        payload: serde_json::json!(result.to_string()),
                    },
                };
                self.run.append_op(op);

                Ok(result.to_string())
            }
            Err(err) => {
                if let Some(option) = option {
                    if let Some(retry) = option.get().retry.clone() {
                        let Retry {
                            max_retries,
                            max_backoff_ms,
                            min_backoff_ms,
                            ..
                        } = retry;
                        if current_retry_count < max_retries {
                            let strategy = RetryStrategy::new(
                                max_retries,
                                Some(min_backoff_ms),
                                Some(max_backoff_ms),
                            )
                            .map_err(|err| PyException::new_err(err.to_string()))?;

                            let retries_left =
                                std::cmp::max(retry.max_retries - current_retry_count, 0);
                            let delay_ms = strategy
                                .eval(retry.strategy.unwrap(), retries_left)
                                .map_err(|err| PyException::new_err(err.to_string()))?;
                            let wait_until_as_ms = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_millis()
                                as i32
                                + delay_ms;

                            let op = OperationEvent::Save {
                                id: self.run.id,
                                value: SavedValue::Retry {
                                    counter: current_retry_count,
                                    wait_until: Utc
                                        .timestamp_millis_opt(wait_until_as_ms as i64)
                                        .unwrap(),
                                },
                            };
                            self.run.append_op(op);
                        }
                        return Err(PyException::new_err(format!("{}", Interupt::SaveRetry)));
                    } else {
                        let op = OperationEvent::Save {
                            id: self.run.id,
                            value: SavedValue::Failed {
                                err: serde_json::json!({
                                   "retries": current_retry_count,
                                   "message": err.to_string()
                                }),
                            },
                        };
                        self.run.append_op(op);
                    }
                }

                Err(err)
            }
        }
    }

    fn sleep(&mut self, durration_ms: i32) -> PyResult<()> {
        self.run
            .sleep(durration_ms)
            .map_err(|err| PyException::new_err(err.to_string()))
    }

    fn append_event(&mut self, event_name: String, payload: PyObject) -> PyResult<()> {
        self.run
            .append_event(event_name, serde_json::json!(payload.to_string()));
        Ok(())
    }

    fn receive(&self, event_name: String) -> PyResult<String> {
        for Operation { event, .. } in self.run.operations.iter() {
            if let OperationEvent::Send {
                event_name: ref sent_name,
                value,
            } = event
            {
                if event_name == *sent_name {
                    return Ok(value.to_string());
                }
            }
        }

        Err(PyException::new_err(format!(
            "{}",
            Interupt::WaitReceiveEvent
        )))
    }

    fn handle(&mut self, py: Python, event_name: String, func: PyObject) -> PyResult<String> {
        for Operation { event, .. } in self.run.operations.iter() {
            if let OperationEvent::Send {
                event_name: ref sent_name,
                value,
            } = event
            {
                if event_name == *sent_name {
                    let func = func.call1(py, (value.to_object(py),))?;
                    return self.save(py, func, None);
                }
            }
        }

        Err(PyException::new_err(format!(
            "{}",
            Interupt::WaitHandleEvent
        )))
    }
}

fn execute_python_function(
    module_path: String,
    function_name: String,
    python_context: PythonContext,
) -> Result<PyObject, PyErr> {
    Python::with_gil(|py| {
        let python_code = std::fs::read_to_string(module_path.clone())
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyIOError, _>(e.to_string()))?;

        let python_module =
            PyModule::from_code_bound(py, &python_code, &module_path, "dynamic_module")?;

        let python_function = python_module.getattr(function_name.as_str())?;

        let execution_result = python_function.call1((python_context,))?;

        Ok(execution_result.into())
    })
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct PythonExecutionInput {
    run: Run,
    internal: TaskContext,
    kwargs: HashMap<String, Value>,
    module_path: String,
    funciton_name: String,
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct PythonExecutionOutput {
    result: Value,
}

#[deno_core::op2]
#[serde]
pub fn op_execute_python_with_context(
    #[serde] input: PythonExecutionInput,
) -> Result<PythonExecutionOutput> {
    // this is a python Class in pyO3
    let python_context = PythonContext {
        query: create_gql_client(input.internal)?,
        run: input.run,
        kwargs: input.kwargs,
    };

    let output = execute_python_function(input.module_path, input.funciton_name, python_context)?;

    let result = serde_json::json!(output.to_string());

    Ok(PythonExecutionOutput { result })
}
