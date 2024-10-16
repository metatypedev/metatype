// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::{MaterializerId, RuntimeId, TypeId as CoreTypeId},
        runtimes::{self as rt, Effect, MaterializerDenoFunc, MaterializerDenoPredefined},
    },
    validation::types::validate_value,
};

use super::Materializer;

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

pub fn get_deno_runtime() -> RuntimeId {
    Store::get_deno_runtime()
}

pub fn register_deno_func(data: MaterializerDenoFunc, effect: Effect) -> Result<MaterializerId> {
    // TODO: check code is valid function?
    let mat = Materializer::deno(DenoMaterializer::Inline(data), effect);
    Ok(Store::register_materializer(mat))
}

pub fn register_deno_static(
    data: rt::MaterializerDenoStatic,
    type_id: CoreTypeId,
) -> Result<MaterializerId> {
    validate_value(
        &serde_json::from_str::<serde_json::Value>(&data.value).map_err(|e| e.to_string())?,
        type_id.into(),
        "<V>".to_string(),
    )?;

    Ok(Store::register_materializer(Materializer::deno(
        DenoMaterializer::Static(MaterializerDenoStatic {
            value: serde_json::from_str(&data.value).map_err(|e| e.to_string())?,
        }),
        Effect::Read,
    )))
}

pub fn get_predefined_deno_func(data: MaterializerDenoPredefined) -> Result<MaterializerId> {
    Store::get_predefined_deno_function(data.name)
}

pub fn import_deno_function(
    data: rt::MaterializerDenoImport,
    effect: Effect,
) -> Result<MaterializerId> {
    let module = Store::get_deno_module(data.module, data.deps);
    let data = MaterializerDenoImport {
        func_name: data.func_name,
        module,
        secrets: data.secrets,
    };
    let mat = Materializer::deno(DenoMaterializer::Import(data), effect);
    Ok(Store::register_materializer(mat))
}
