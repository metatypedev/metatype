// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::runtimes as wit;

#[derive(Debug)]
pub struct MaterializerDenoModule {
    pub file: String,
}

#[derive(Debug)]
pub struct MaterializerDenoImport {
    pub func_name: String,
    pub module: wit::MaterializerId,
    pub secrets: Vec<String>,
}

#[derive(Debug)]
pub struct MaterializerDenoStatic {
    pub value: serde_json::Value,
}

#[derive(Debug)]
pub enum DenoMaterializer {
    Static(MaterializerDenoStatic),
    Inline(wit::MaterializerDenoFunc),
    Predefined(wit::MaterializerDenoPredefined),
    Module(MaterializerDenoModule),
    Import(MaterializerDenoImport),
}
