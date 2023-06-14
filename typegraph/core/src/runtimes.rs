// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    global_store::store,
    wit::core::RuntimeId,
    wit::runtimes::{self as wit, Error as TgError},
};

type Result<T, E = TgError> = std::result::Result<T, E>;

#[derive(Debug)]
pub enum Runtime {
    Deno,
}

#[derive(Debug)]
pub struct Materializer {
    pub runtime_id: RuntimeId,
    pub effect: wit::Effect,
    pub data: MaterializerData,
}

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

impl Materializer {
    // fn new(base: wit::BaseMaterializer, data: impl Into<MaterializerData>) -> Self {
    //     Self {
    //         runtime_id: base.runtime,
    //         effect: base.effect,
    //         data: data.into(),
    //     }
    // }

    fn deno(data: DenoMaterializer, effect: wit::Effect) -> Self {
        Self {
            runtime_id: store().get_default_deno_runtime(),
            effect,
            data: data.into(),
        }
    }
}

#[derive(Debug)]
pub enum MaterializerData {
    Deno(DenoMaterializer),
}

impl From<DenoMaterializer> for MaterializerData {
    fn from(mat: DenoMaterializer) -> Self {
        Self::Deno(mat)
    }
}

impl crate::wit::runtimes::Runtimes for crate::Lib {
    fn register_deno_func(
        data: wit::MaterializerDenoFunc,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        // TODO: check code is valid function?
        let mat = Materializer::deno(DenoMaterializer::Inline(data), effect);
        Ok(store().register_materializer(mat))
    }

    fn get_predefined_deno_func(
        data: wit::MaterializerDenoPredefined,
    ) -> Result<wit::MaterializerId> {
        store().get_predefined_deno_function(data.name)
    }

    fn import_deno_function(
        data: wit::MaterializerDenoImport,
        effect: wit::Effect,
    ) -> Result<wit::MaterializerId> {
        let module = store().get_deno_module(data.module);
        let data = MaterializerDenoImport {
            func_name: data.func_name,
            module,
            secrets: data.secrets,
        };
        let mat = Materializer::deno(DenoMaterializer::Import(data), effect);
        Ok(store().register_materializer(mat))
    }
}
