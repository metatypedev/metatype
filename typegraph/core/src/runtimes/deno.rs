// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::runtimes::{self as wit, Error as TgError};

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
pub enum DenoMaterializer {
    Inline(wit::MaterializerDenoFunc),
    Predefined(wit::MaterializerDenoPredefined),
    Module(MaterializerDenoModule),
    Import(MaterializerDenoImport),
}
