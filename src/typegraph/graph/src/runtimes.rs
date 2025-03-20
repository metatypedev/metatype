// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::Arc;
use indexmap::IndexMap;
use serde_json::Value;
use tg_schema::{runtimes::TGRuntime, Effect};

#[derive(Debug)]
pub struct MaterializerNode {
    pub name: String,
    pub runtime: Runtime,
    pub effect: Effect,
    // TODO this should be a more specific type
    // - as there might be some references to other materializers
    pub data: IndexMap<String, Value>,
}

pub fn convert_materializer(runtimes: &[Runtime], mat: &tg_schema::Materializer) -> Materializer {
    let runtime = runtimes[mat.runtime as usize].clone();
    Arc::new(MaterializerNode {
        name: mat.name.clone(),
        runtime,
        effect: mat.effect.clone(),
        data: mat.data.clone(),
    })
}

pub type Materializer = Arc<MaterializerNode>;
pub type Runtime = Arc<TGRuntime>;
