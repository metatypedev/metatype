// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::runtimes::{self as wit};

#[derive(Debug)]
pub enum PythonMaterializer {
    Lambda(wit::MaterializerPythonLambda),
    Def(wit::MaterializerPythonDef),
    Module(wit::MaterializerPythonModule),
    Import(wit::MaterializerPythonImport),
}
