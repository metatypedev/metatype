// rustimport:pyo3

use lazy_static::lazy_static;
use log::info;
use pyo3::prelude::*;
use tokio::runtime::Runtime;
mod prisma;
use crate::prisma::migration;
use dict_derive::{FromPyObject, IntoPyObject};

lazy_static! {
    static ref RT: Runtime = {
        info!("Runtime created");
        Runtime::new().unwrap()
    };
}

//

#[derive(FromPyObject)]
struct MigrateIn {
    datasource: String,
    datamodel: String,
}

#[derive(IntoPyObject)]
struct MigrateOut {
    result: Option<String>,
    error: Option<String>,
}

#[pyfunction]
fn migrate(inp: MigrateIn) -> PyResult<MigrateOut> {
    let fut = migration::push(inp.datasource, inp.datamodel);
    let res = match RT.block_on(fut) {
        Ok(result) => MigrateOut {
            result: Some(result),
            error: None,
        },
        Err(error) => MigrateOut {
            result: None,
            error: Some(format!("error: {}", error)),
        },
    };
    Ok(res)
}

//

#[derive(FromPyObject)]
struct DiffIn {
    datasource: String,
    datamodel: String,
}

#[derive(IntoPyObject)]
struct DiffOut {
    message: String,
}

#[pyfunction]
fn diff(inp: DiffIn) -> PyResult<DiffOut> {
    let fut = migration::diff(inp.datasource, inp.datamodel);
    let res = match RT.block_on(fut) {
        Ok(exit_code) => DiffOut {
            message: "success".to_string(),
        },
        Err(error) => DiffOut {
            message: format!("error: {}", error),
        },
    };
    Ok(res)
}

#[pyfunction]
fn format(schema: String) -> PyResult<String> {
    Ok(datamodel::reformat(&schema, 2).unwrap())
}

#[pyfunction]
fn echo(noise: String) -> PyResult<String> {
    Ok(format!("{}!", noise))
}

//

#[pymodule]
fn native(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(migrate, m)?)?;
    m.add_function(wrap_pyfunction!(diff, m)?)?;
    m.add_function(wrap_pyfunction!(format, m)?)?;
    m.add_function(wrap_pyfunction!(echo, m)?)?;

    Ok(())
}
