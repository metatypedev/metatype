use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::{
    types::{
        core::{RuntimeId, TypeId},
        runtimes::*,
    },
    Result,
};

use super::TypegraphFunc;

#[rustfmt::skip]
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum RuntimeCall {
    GetDenoRuntime,
    RegisterDenoFunc { data: MaterializerDenoFunc, effect: Effect },
    RegisterDenoStatic { data: MaterializerDenoStatic, effect: Effect },
    GetPredefindedDenoFunc { data: MaterializerDenoPredefined },
    ImportDenoFunction { data: MaterializerDenoImport },
    RegisterGraphqlRuntime { data: GraphqlRuntimeData },
    GraphqlQuery { base: BaseMaterializer, data: MaterializerGraphqlQuery },
    GraphqlMutation { base: BaseMaterializer, data: MaterializerGraphqlQuery },
    RegisterHttpRuntime { data: HttpRuntimeData },
    HttpRequest { base: BaseMaterializer, data: MaterializerHttpRequest },
    RegisterPythonRuntime,
    FromPythonLambda { base: BaseMaterializer, data: MaterializerPythonLambda },
    FromPythonDef { base: BaseMaterializer, data: MaterializerPythonDef },
    FromPythonModule { base: BaseMaterializer, data: MaterializerPythonModule },
    FromPythonImport { base: BaseMaterializer, data: MaterializerPythonImport },
    RegisterRandomRuntime { data: RandomRuntimeData },
    CreateRandomMat { base: BaseMaterializer, data: MaterializerRandom },
    RegisterWasmReflectedRuntime { data: WasmRuntimeData },
    FromWasmReflectedFunc { base: BaseMaterializer, data: MaterializerWasmReflectedFunc },
    RegisterWasmWireRuntime { data: WasmRuntimeData },
    FromWasmWireHandler { base: BaseMaterializer, data: MaterializerWasmWireHandler },
    RegisterPrismaRuntime { data: PrismaRuntimeData },
    PrismaFindUnique { runtime: RuntimeId, model: TypeId },
    PrismaFindMany { runtime: RuntimeId, model: TypeId },
    PrismaFindFirst { runtime: RuntimeId, model: TypeId },
    PrismaAggregate { runtime: RuntimeId, model: TypeId },
    PrismaCount { runtime: RuntimeId, model: TypeId },
    PrismaGroupBy { runtime: RuntimeId, model: TypeId },
    PrismaCreateOne { runtime: RuntimeId, model: TypeId },
    PrismaCreateMany { runtime: RuntimeId, model: TypeId },
    PrismaUpdateOne { runtime: RuntimeId, model: TypeId },
    PrismaUpdateMany { runtime: RuntimeId, model: TypeId },
    PrismaUpsertOne { runtime: RuntimeId, model: TypeId },
    PrismaDeleteOne { runtime: RuntimeId, model: TypeId },
    PrismaDeleteMany { runtime: RuntimeId, model: TypeId },
    PrismaExecute { runtime: RuntimeId, query: String, param: TypeId, effect: Effect },
    PrismaQueryRaw { runtime: RuntimeId, query: String, param: Option<TypeId>, out: TypeId },
    PrismaLink { data: PrismaLinkData },
    RegisterTemporalRuntime { data: TemporalRuntimeData },
    GenerateTemporalOperation { runtime: RuntimeId, data: TemporalOperationData },
    RegisterTypegateMaterializer { operation: TypegateOperation },
    RegisterTypegraphMaterializer { operation: TypegraphOperation },
    RegisterSubstantialRuntime { data: SubstantialRuntimeData },
    GenerateSubstantialOperation { runtime: RuntimeId, data: SubstantialOperationData },
    RegisterKvRuntime { data: KvRuntimeData },
    KvOperation { base: BaseMaterializer, data: KvMaterializer },
    RegisterGrpcRuntime { data: GrpcRuntimeData },
    CallGrpcMethod { runtime: RuntimeId, data: GrpcData },
}

impl TypegraphFunc for RuntimeCall {
    fn execute(self) -> Result<Value> {
        todo!()
    }
}
