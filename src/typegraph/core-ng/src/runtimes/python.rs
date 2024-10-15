// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::types::runtimes::{
    MaterializerPythonDef, MaterializerPythonImport, MaterializerPythonLambda,
    MaterializerPythonModule,
};

#[derive(Debug)]
pub enum PythonMaterializer {
    Lambda(MaterializerPythonLambda),
    Def(MaterializerPythonDef),
    Module(MaterializerPythonModule),
    Import(MaterializerPythonImport),
}
