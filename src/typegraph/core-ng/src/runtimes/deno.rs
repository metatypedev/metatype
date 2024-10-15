// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::types::{
    core::MaterializerId,
    runtimes::{MaterializerDenoFunc, MaterializerDenoPredefined},
};

#[derive(Debug)]
pub struct MaterializerDenoModule {
    pub file: String,
    pub deps: Vec<String>,
}

#[derive(Debug)]
pub struct MaterializerDenoImport {
    pub func_name: String,
    pub module: MaterializerId,
    pub secrets: Vec<String>,
}

#[derive(Debug)]
pub struct MaterializerDenoStatic {
    pub value: serde_json::Value,
}

#[derive(Debug)]
pub enum DenoMaterializer {
    Static(MaterializerDenoStatic),
    Inline(MaterializerDenoFunc),
    Predefined(MaterializerDenoPredefined),
    Module(MaterializerDenoModule),
    Import(MaterializerDenoImport),
}
