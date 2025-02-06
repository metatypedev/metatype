// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::sdk::runtimes::{self as sdk};

#[derive(Debug)]
pub enum PythonMaterializer {
    Lambda(sdk::MaterializerPythonLambda),
    Def(sdk::MaterializerPythonDef),
    Module(sdk::MaterializerPythonModule),
    Import(sdk::MaterializerPythonImport),
}
