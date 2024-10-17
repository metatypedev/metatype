// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

mod type_generation;

use std::{path::Path, rc::Rc};

use common::typegraph::Materializer;
use serde_json::{from_value, json};

use crate::{
    conversion::runtimes::MaterializerConverter,
    errors::Result,
    global_store::Store,
    typegraph::{current_typegraph_dir, TypegraphContext},
    types::{
        core::{FuncParams, RuntimeId},
        runtimes::{Effect, GrpcData, GrpcRuntimeData},
    },
    utils::fs::FsContext,
};

use super::Runtime;

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

pub fn register_grpc_runtime(data: GrpcRuntimeData) -> Result<RuntimeId> {
    let fs_ctx = FsContext::new(current_typegraph_dir()?);
    let proto_file = fs_ctx.read_text_file(Path::new(&data.proto_file))?;
    let data = GrpcRuntimeData { proto_file, ..data };

    Ok(Store::register_runtime(Runtime::Grpc(data.into())))
}
