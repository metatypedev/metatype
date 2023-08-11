// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use self::{
    deno::DenoRuntimeData, graphql::GraphQLRuntimeData, http::HTTPRuntimeData,
    prisma::PrismaRuntimeData, random::RandomRuntimeData, s3::S3RuntimeData,
    temporal::TemporalRuntimeData,
};

pub mod deno;
pub mod graphql;
pub mod http;
pub mod prisma;
pub mod random;
pub mod s3;
pub mod temporal;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "name", content = "data", rename_all = "lowercase")]
pub enum KnownRuntime {
    Deno(DenoRuntimeData),
    GraphQL(GraphQLRuntimeData),
    HTTP(HTTPRuntimeData),
    Python,
    Random(RandomRuntimeData),
    Prisma(PrismaRuntimeData),
    S3(S3RuntimeData),
    Temporal(TemporalRuntimeData),
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
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
