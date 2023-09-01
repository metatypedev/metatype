// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use self::{
    deno::DenoRuntimeData, graphql::GraphQLRuntimeData, http::HTTPRuntimeData,
    prisma::PrismaRuntimeData, python::PythonRuntimeData, random::RandomRuntimeData,
    s3::S3RuntimeData, temporal::TemporalRuntimeData, wasmedge::WasmEdgeRuntimeData,
};

pub mod deno;
pub mod graphql;
pub mod http;
pub mod prisma;
pub mod python;
pub mod random;
pub mod s3;
pub mod temporal;
pub mod wasmedge;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "name", content = "data", rename_all = "lowercase")]
pub enum KnownRuntime {
    Deno(DenoRuntimeData),
    GraphQL(GraphQLRuntimeData),
    HTTP(HTTPRuntimeData),
    #[serde(rename = "python_wasi")]
    PythonWasi(PythonRuntimeData),
    Random(RandomRuntimeData),
    Prisma(PrismaRuntimeData),
    S3(S3RuntimeData),
    Temporal(TemporalRuntimeData),
    WasmEdge(WasmEdgeRuntimeData),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct UnknownRuntime {
    pub name: String,
    pub data: IndexMap<String, serde_json::Value>,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum TGRuntime {
    Known(KnownRuntime),
    Unknown(UnknownRuntime),
}
