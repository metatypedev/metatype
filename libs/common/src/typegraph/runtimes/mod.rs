// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::PathBuf;

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use self::deno::DenoRuntimeData;
use self::graphql::GraphQLRuntimeData;
use self::http::HTTPRuntimeData;
use self::prisma::PrismaRuntimeData;
use self::python::PythonRuntimeData;
use self::random::RandomRuntimeData;
use self::s3::S3RuntimeData;
use self::temporal::TemporalRuntimeData;
use self::wasm::WasmRuntimeData;

pub mod deno;
pub mod graphql;
pub mod http;
pub mod prisma;
pub mod python;
pub mod random;
pub mod s3;
pub mod temporal;
pub mod wasm;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TypegateRuntimeData {}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TypegraphRuntimeData {}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrismaMigrationRuntimeData {}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "name", content = "data", rename_all = "snake_case")]
pub enum KnownRuntime {
    Deno(DenoRuntimeData),
    #[serde(rename = "graphql")]
    GraphQL(GraphQLRuntimeData),
    #[serde(rename = "http")]
    HTTP(HTTPRuntimeData),
    Python(PythonRuntimeData),
    Random(RandomRuntimeData),
    Prisma(PrismaRuntimeData),
    PrismaMigration(PrismaMigrationRuntimeData),
    S3(S3RuntimeData),
    Temporal(TemporalRuntimeData),
    WasmReflected(WasmRuntimeData),
    WasmWire(WasmRuntimeData),
    Typegate(TypegateRuntimeData),
    Typegraph(TypegraphRuntimeData),
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

impl TGRuntime {
    pub fn name(&self) -> &str {
        match self {
            TGRuntime::Known(known) => match known {
                KnownRuntime::Deno(_) => "deno",
                KnownRuntime::GraphQL(_) => "graphql",
                KnownRuntime::HTTP(_) => "http",
                KnownRuntime::Python(_) => "python",
                KnownRuntime::Random(_) => "random",
                KnownRuntime::Prisma(_) => "prisma",
                KnownRuntime::PrismaMigration(_) => "prisma_migration",
                KnownRuntime::S3(_) => "s3",
                KnownRuntime::Temporal(_) => "temporal",
                KnownRuntime::WasmWire(_) => "wasm_wire",
                KnownRuntime::WasmReflected(_) => "wasm_reflected",
                KnownRuntime::Typegate(_) => "typegate",
                KnownRuntime::Typegraph(_) => "typegraph",
            },
            TGRuntime::Unknown(UnknownRuntime { name, .. }) => name,
        }
    }
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Artifact {
    pub path: PathBuf,
    pub hash: String,
    pub size: u32,
}
