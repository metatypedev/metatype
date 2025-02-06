// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod type_generation;

use std::rc::Rc;

use super::Runtime;
use crate::global_store::Store;
use crate::sdk::core::{FuncParams, RuntimeId};
use crate::sdk::runtimes::{Effect, GrpcData, GrpcRuntimeData};
use crate::{
    conversion::runtimes::MaterializerConverter, errors::Result, typegraph::TypegraphContext,
};

use tg_schema::Materializer;

use serde_json::{from_value, json};

#[derive(Debug)]
pub struct GrpcMaterializer {
    pub method: String,
}

impl MaterializerConverter for GrpcMaterializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: RuntimeId,
        effect: Effect,
    ) -> Result<Materializer> {
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

fn get_gprc_data(runtime_id: RuntimeId) -> Result<Rc<GrpcRuntimeData>> {
    match Store::get_runtime(runtime_id)? {
        Runtime::Grpc(data) => Ok(data),
        _ => unreachable!(),
    }
}

pub fn call_grpc_method(runtime: RuntimeId, data: GrpcData) -> Result<FuncParams> {
    let grpc_runtime_data = get_gprc_data(runtime)?;

    let mat = GrpcMaterializer {
        method: data.method.clone(),
    };

    let mat_id =
        Store::register_materializer(super::Materializer::grpc(runtime, mat, Effect::Read));

    let t = type_generation::generate_type(&grpc_runtime_data.proto_file, &data.method)
        .map_err(|err| format!("failed generate type {err}"))?;

    Ok(FuncParams {
        inp: t.input.0,
        out: t.output.0,
        mat: mat_id,
    })
}
