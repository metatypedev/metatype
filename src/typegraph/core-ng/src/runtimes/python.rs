// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::{MaterializerId, RuntimeId},
        runtimes::{
            BaseMaterializer, MaterializerPythonDef, MaterializerPythonImport,
            MaterializerPythonLambda, MaterializerPythonModule,
        },
    },
};

use super::{Materializer, Runtime};

#[derive(Debug)]
pub enum PythonMaterializer {
    Lambda(MaterializerPythonLambda),
    Def(MaterializerPythonDef),
    Module(MaterializerPythonModule),
    Import(MaterializerPythonImport),
}

pub fn register_python_runtime() -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::Python))
}

pub fn from_python_lambda(
    base: BaseMaterializer,
    data: MaterializerPythonLambda,
) -> Result<MaterializerId> {
    let mat = Materializer::python(base.runtime, PythonMaterializer::Lambda(data), base.effect);
    Ok(Store::register_materializer(mat))
}

pub fn from_python_def(
    base: BaseMaterializer,
    data: MaterializerPythonDef,
) -> Result<MaterializerId> {
    let mat = Materializer::python(base.runtime, PythonMaterializer::Def(data), base.effect);
    Ok(Store::register_materializer(mat))
}

pub fn from_python_module(
    base: BaseMaterializer,
    data: MaterializerPythonModule,
) -> Result<MaterializerId> {
    let mat = Materializer::python(base.runtime, PythonMaterializer::Module(data), base.effect);
    Ok(Store::register_materializer(mat))
}

pub fn from_python_import(
    base: BaseMaterializer,
    data: MaterializerPythonImport,
) -> Result<MaterializerId> {
    let mat = Materializer::python(base.runtime, PythonMaterializer::Import(data), base.effect);
    Ok(Store::register_materializer(mat))
}
