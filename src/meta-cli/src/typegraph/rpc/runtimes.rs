// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};
use serde_json::Value;
#[allow(unused)]
use typegraph_core::sdk::core::{FuncParams, MaterializerId, RuntimeId, TypeId};
use typegraph_core::sdk::runtimes::*;
use typegraph_core::{errors::Result, Lib};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all = "snake_case")]
pub enum RpcCall {
    GetDenoRuntime,
    RegisterDenoFunc {
        data: MaterializerDenoFunc,
        effect: Effect,
    },
    RegisterDenoStatic {
        data: MaterializerDenoStatic,
        type_id: TypeId,
    },
    GetPredefinedDenoFunc {
        data: MaterializerDenoPredefined,
    },
    ImportDenoFunction {
        data: MaterializerDenoImport,
        effect: Effect,
    },
    RegisterGraphqlRuntime {
        data: GraphqlRuntimeData,
    },
    GraphqlQuery {
        base: BaseMaterializer,
        data: MaterializerGraphqlQuery,
    },
    GraphqlMutation {
        base: BaseMaterializer,
        data: MaterializerGraphqlQuery,
    },
    RegisterHttpRuntime {
        data: HttpRuntimeData,
    },
    HttpRequest {
        base: BaseMaterializer,
        data: MaterializerHttpRequest,
    },
    RegisterPythonRuntime,
    FromPythonLambda {
        base: BaseMaterializer,
        data: MaterializerPythonLambda,
    },
    FromPythonDef {
        base: BaseMaterializer,
        data: MaterializerPythonDef,
    },
    FromPythonModule {
        base: BaseMaterializer,
        data: MaterializerPythonModule,
    },
    FromPythonImport {
        base: BaseMaterializer,
        data: MaterializerPythonImport,
    },
    RegisterRandomRuntime {
        data: RandomRuntimeData,
    },
    CreateRandomMat {
        base: BaseMaterializer,
        data: MaterializerRandom,
    },
    RegisterWasmReflectedRuntime {
        data: WasmRuntimeData,
    },
    FromWasmReflectedFunc {
        base: BaseMaterializer,
        data: MaterializerWasmReflectedFunc,
    },
    RegisterWasmWireRuntime {
        data: WasmRuntimeData,
    },
    FromWasmWireHandler {
        base: BaseMaterializer,
        data: MaterializerWasmWireHandler,
    },
    RegisterPrismaRuntime {
        data: PrismaRuntimeData,
    },
    PrismaFindUnique {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaFindMany {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaFindFirst {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaAggregate {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaGroupBy {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaCreateOne {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaCreateMany {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaUpdateOne {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaUpdateMany {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaUpsertOne {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaDeleteOne {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaDeleteMany {
        runtime: RuntimeId,
        model: TypeId,
    },
    PrismaExecute {
        runtime: RuntimeId,
        query: String,
        param: TypeId,
        effect: Effect,
    },
    PrismaQueryRaw {
        runtime: RuntimeId,
        query: String,
        out: TypeId,
        param: Option<TypeId>,
    },
    PrismaLink {
        data: PrismaLinkData,
    },
    PrismaMigration {
        operation: PrismaMigrationOperation,
    },
    RegisterTemporalRuntime {
        data: TemporalRuntimeData,
    },
    GenerateTemporalOperation {
        runtime: RuntimeId,
        data: TemporalOperationData,
    },
    RegisterTypegateMaterializer {
        operation: TypegateOperation,
    },
    RegisterTypegraphMaterializer {
        operation: TypegraphOperation,
    },
    RegisterSubstantialRuntime {
        data: SubstantialRuntimeData,
    },
    GenerateSubstantialOperation {
        runtime: RuntimeId,
        data: SubstantialOperationData,
    },
    RegisterKvRuntime {
        data: KvRuntimeData,
    },
    KvOperation {
        base: BaseMaterializer,
        data: KvMaterializer,
    },
    RegisterGrpcRuntime {
        data: GrpcRuntimeData,
    },
    CallGrpcMethod {
        runtime: RuntimeId,
        data: GrpcData,
    },
}

impl super::RpcDispatch for RpcCall {
    fn dispatch(self) -> Result<Value> {
        match self {
            Self::GetDenoRuntime => {
                Lib::get_deno_runtime().map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterDenoFunc { data, effect } => {
                Lib::register_deno_func(data, effect).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterDenoStatic { data, type_id } => Lib::register_deno_static(data, type_id)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::GetPredefinedDenoFunc { data } => {
                Lib::get_predefined_deno_func(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::ImportDenoFunction { data, effect } => Lib::import_deno_function(data, effect)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::RegisterGraphqlRuntime { data } => {
                Lib::register_graphql_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GraphqlQuery { base, data } => {
                Lib::graphql_query(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GraphqlMutation { base, data } => {
                Lib::graphql_mutation(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterHttpRuntime { data } => {
                Lib::register_http_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::HttpRequest { base, data } => {
                Lib::http_request(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterPythonRuntime => {
                Lib::register_python_runtime().map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromPythonLambda { base, data } => {
                Lib::from_python_lambda(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromPythonDef { base, data } => {
                Lib::from_python_def(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromPythonModule { base, data } => {
                Lib::from_python_module(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromPythonImport { base, data } => {
                Lib::from_python_import(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterRandomRuntime { data } => {
                Lib::register_random_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::CreateRandomMat { base, data } => {
                Lib::create_random_mat(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterWasmReflectedRuntime { data } => {
                Lib::register_wasm_reflected_runtime(data)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromWasmReflectedFunc { base, data } => Lib::from_wasm_reflected_func(base, data)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::RegisterWasmWireRuntime { data } => {
                Lib::register_wasm_wire_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::FromWasmWireHandler { base, data } => Lib::from_wasm_wire_handler(base, data)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::RegisterPrismaRuntime { data } => {
                Lib::register_prisma_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaFindUnique { runtime, model } => Lib::prisma_find_unique(runtime, model)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaFindMany { runtime, model } => {
                Lib::prisma_find_many(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaFindFirst { runtime, model } => {
                Lib::prisma_find_first(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaAggregate { runtime, model } => {
                Lib::prisma_aggregate(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaGroupBy { runtime, model } => {
                Lib::prisma_group_by(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaCreateOne { runtime, model } => {
                Lib::prisma_create_one(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaCreateMany { runtime, model } => Lib::prisma_create_many(runtime, model)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaUpdateOne { runtime, model } => {
                Lib::prisma_update_one(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaUpdateMany { runtime, model } => Lib::prisma_update_many(runtime, model)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaUpsertOne { runtime, model } => {
                Lib::prisma_upsert_one(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaDeleteOne { runtime, model } => {
                Lib::prisma_delete_one(runtime, model).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaDeleteMany { runtime, model } => Lib::prisma_delete_many(runtime, model)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaExecute {
                runtime,
                query,
                param,
                effect,
            } => Lib::prisma_execute(runtime, query, param, effect)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaQueryRaw {
                runtime,
                query,
                out,
                param,
            } => Lib::prisma_query_raw(runtime, query, out, param)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::PrismaLink { data } => {
                Lib::prisma_link(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::PrismaMigration { operation } => {
                Lib::prisma_migration(operation).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterTemporalRuntime { data } => {
                Lib::register_temporal_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GenerateTemporalOperation { runtime, data } => {
                Lib::generate_temporal_operation(runtime, data)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterTypegateMaterializer { operation } => {
                Lib::register_typegate_materializer(operation)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterTypegraphMaterializer { operation } => {
                Lib::register_typegraph_materializer(operation)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterSubstantialRuntime { data } => Lib::register_substantial_runtime(data)
                .map(|res| serde_json::to_value(res).unwrap()),
            Self::GenerateSubstantialOperation { runtime, data } => {
                Lib::generate_substantial_operation(runtime, data)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterKvRuntime { data } => {
                Lib::register_kv_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::KvOperation { base, data } => {
                Lib::kv_operation(base, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::RegisterGrpcRuntime { data } => {
                Lib::register_grpc_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::CallGrpcMethod { runtime, data } => {
                Lib::call_grpc_method(runtime, data).map(|res| serde_json::to_value(res).unwrap())
            }
        }
    }
}
