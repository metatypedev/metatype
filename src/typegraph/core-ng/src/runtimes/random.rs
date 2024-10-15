// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::MaterializerId,
        runtimes::{BaseMaterializer, MaterializerRandom, RandomRuntimeData},
    },
};

use super::{Materializer, Runtime};

#[derive(Debug)]
pub enum RandomMaterializer {
    Runtime(MaterializerRandom),
}

pub fn register_random_runtime(data: RandomRuntimeData) -> Result<MaterializerId> {
    Ok(Store::register_runtime(Runtime::Random(data.into())))
}

pub fn create_random_mat(
    base: BaseMaterializer,
    data: MaterializerRandom,
) -> Result<MaterializerId> {
    let mat = Materializer::random(base.runtime, RandomMaterializer::Runtime(data), base.effect);
    Ok(Store::register_materializer(mat))
}
