// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::rc::Rc;

use crate::errors::Result;
use crate::global_store::Store;
use crate::wit::core::RuntimeId;
use crate::wit::runtimes::{Effect as WitEffect, GrpcRuntimeData};
use crate::{conversion::runtimes::MaterializerConverter, typegraph::TypegraphContext};

use common::typegraph::Materializer;

use serde_json::{from_value, json};

use super::Runtime;

pub mod type_generation;

pub fn get_gprc_data(runtime_id: RuntimeId) -> Rc<GrpcRuntimeData> {
    match Store::get_runtime(runtime_id).unwrap() {
        Runtime::Grpc(data) => data,
        _ => unreachable!(),
    }
}

#[derive(Debug)]
pub struct GrpcMaterializer {
    pub method: String,
}

impl MaterializerConverter for GrpcMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: WitEffect,
    ) -> Result<common::typegraph::Materializer> {
        let runtime = c.register_runtime(runtime_id)?;
        let data = from_value(json!({"method": self.method})).map_err(|e| e.to_string())?;
        Ok(Materializer {
            name: "grpc".into(),
            runtime,
            effect: effect.into(),
            data,
        })
    }
}
