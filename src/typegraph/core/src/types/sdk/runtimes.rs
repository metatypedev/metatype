// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::core::{FuncParams, MaterializerId, RuntimeId, TypeId};
use serde::{Deserialize, Serialize};

pub type Idempotency = bool;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Effect {
    Read,
    Create(Idempotency),
    Update(Idempotency),
    Delete(Idempotency),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseMaterializer {
    pub runtime: RuntimeId,
    pub effect: Effect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerDenoFunc {
    pub code: String,
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerDenoStatic {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerDenoPredefined {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerDenoImport {
    pub func_name: String,
    pub module: String,
    pub deps: Vec<String>,
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphqlRuntimeData {
    pub endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerGraphqlQuery {
    pub path: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRuntimeData {
    pub endpoint: String,
    pub cert_secret: Option<String>,
    pub basic_auth_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerHttpRequest {
    pub method: HttpMethod,
    pub path: String,
    pub content_type: Option<String>,
    pub header_prefix: Option<String>,
    pub query_fields: Option<Vec<String>>,
    pub rename_fields: Option<Vec<(String, String)>>,
    pub body_fields: Option<Vec<String>>,
    pub auth_token_field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerPythonDef {
    pub runtime: RuntimeId,
    pub name: String,
    pub function: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerPythonLambda {
    pub runtime: RuntimeId,
    pub function: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerPythonModule {
    pub runtime: RuntimeId,
    pub file: String,
    pub deps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerPythonImport {
    pub module: u32,
    pub func_name: String,
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RandomRuntimeData {
    pub seed: Option<u32>,
    pub reset: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerRandom {
    pub runtime: RuntimeId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmRuntimeData {
    pub wasm_artifact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerWasmReflectedFunc {
    pub func_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterializerWasmWireHandler {
    pub func_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub connection_string_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrismaLinkData {
    pub target_type: TypeId,
    pub relationship_name: Option<String>,
    pub foreign_key: Option<bool>,
    pub target_field: Option<String>,
    pub unique: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrismaMigrationOperation {
    Diff,
    Create,
    Apply,
    Deploy,
    Reset,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalRuntimeData {
    pub name: String,
    pub host_secret: String,
    pub namespace_secret: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TemporalOperationType {
    StartWorkflow,
    SignalWorkflow,
    QueryWorkflow,
    DescribeWorkflow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalOperationData {
    pub mat_arg: Option<String>,
    pub func_arg: Option<TypeId>,
    pub func_out: Option<TypeId>,
    pub operation: TemporalOperationType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TypegateOperation {
    ListTypegraphs,
    FindTypegraph,
    AddTypegraph,
    RemoveTypegraphs,
    GetSerializedTypegraph,
    GetArgInfoByPath,
    FindAvailableOperations,
    FindPrismaModels,
    RawPrismaRead,
    RawPrismaCreate,
    RawPrismaUpdate,
    RawPrismaDelete,
    QueryPrismaModel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TypegraphOperation {
    Resolver,
    GetType,
    GetSchema,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisBackend {
    pub connection_string_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubstantialBackend {
    Memory,
    Fs,
    Redis(RedisBackend),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowKind {
    Python,
    Deno,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowFileDescription {
    pub workflows: Vec<String>,
    pub file: String,
    pub deps: Vec<String>,
    pub kind: WorkflowKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubstantialRuntimeData {
    pub backend: SubstantialBackend,
    pub file_descriptions: Vec<WorkflowFileDescription>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubstantialStartData {
    pub func_arg: Option<TypeId>,
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubstantialOperationData {
    Start(SubstantialStartData),
    StartRaw(SubstantialStartData),
    Stop,
    Send(TypeId),
    SendRaw,
    Resources,
    Results(TypeId),
    ResultsRaw,
    InternalLinkParentChild,
    AdvancedFilters,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KvRuntimeData {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KvMaterializer {
    Get,
    Set,
    Delete,
    Keys,
    Values,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcRuntimeData {
    pub proto_file: String,
    pub endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrpcData {
    pub method: String,
}

pub trait Handler {
    fn get_deno_runtime() -> Result<RuntimeId, super::Error>;
    fn register_deno_func(
        data: MaterializerDenoFunc,
        effect: Effect,
    ) -> Result<MaterializerId, super::Error>;
    fn register_deno_static(
        data: MaterializerDenoStatic,
        type_id: TypeId,
    ) -> Result<MaterializerId, super::Error>;
    fn get_predefined_deno_func(
        data: MaterializerDenoPredefined,
    ) -> Result<MaterializerId, super::Error>;
    fn import_deno_function(
        data: MaterializerDenoImport,
        effect: Effect,
    ) -> Result<MaterializerId, super::Error>;
    fn register_graphql_runtime(data: GraphqlRuntimeData) -> Result<RuntimeId, super::Error>;
    fn graphql_query(
        base: BaseMaterializer,
        data: MaterializerGraphqlQuery,
    ) -> Result<MaterializerId, super::Error>;
    fn graphql_mutation(
        base: BaseMaterializer,
        data: MaterializerGraphqlQuery,
    ) -> Result<MaterializerId, super::Error>;
    fn register_http_runtime(data: HttpRuntimeData) -> Result<RuntimeId, super::Error>;
    fn http_request(
        base: BaseMaterializer,
        data: MaterializerHttpRequest,
    ) -> Result<MaterializerId, super::Error>;
    fn register_python_runtime() -> Result<RuntimeId, super::Error>;
    fn from_python_lambda(
        base: BaseMaterializer,
        data: MaterializerPythonLambda,
    ) -> Result<MaterializerId, super::Error>;
    fn from_python_def(
        base: BaseMaterializer,
        data: MaterializerPythonDef,
    ) -> Result<MaterializerId, super::Error>;
    fn from_python_module(
        base: BaseMaterializer,
        data: MaterializerPythonModule,
    ) -> Result<MaterializerId, super::Error>;
    fn from_python_import(
        base: BaseMaterializer,
        data: MaterializerPythonImport,
    ) -> Result<MaterializerId, super::Error>;
    fn register_random_runtime(data: RandomRuntimeData) -> Result<MaterializerId, super::Error>;
    fn create_random_mat(
        base: BaseMaterializer,
        data: MaterializerRandom,
    ) -> Result<MaterializerId, super::Error>;
    fn register_wasm_reflected_runtime(data: WasmRuntimeData) -> Result<RuntimeId, super::Error>;
    fn from_wasm_reflected_func(
        base: BaseMaterializer,
        data: MaterializerWasmReflectedFunc,
    ) -> Result<MaterializerId, super::Error>;
    fn register_wasm_wire_runtime(data: WasmRuntimeData) -> Result<RuntimeId, super::Error>;
    fn from_wasm_wire_handler(
        base: BaseMaterializer,
        data: MaterializerWasmWireHandler,
    ) -> Result<MaterializerId, super::Error>;
    fn register_prisma_runtime(data: PrismaRuntimeData) -> Result<RuntimeId, super::Error>;
    fn prisma_find_unique(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_find_many(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_find_first(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_aggregate(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_group_by(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_create_one(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_create_many(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_update_one(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_update_many(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_upsert_one(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_delete_one(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_delete_many(runtime: RuntimeId, model: TypeId) -> Result<FuncParams, super::Error>;
    fn prisma_execute(
        runtime: RuntimeId,
        query: String,
        param: TypeId,
        effect: Effect,
    ) -> Result<FuncParams, super::Error>;
    fn prisma_query_raw(
        runtime: RuntimeId,
        query: String,
        out: TypeId,
        param: Option<TypeId>,
    ) -> Result<FuncParams, super::Error>;
    fn prisma_link(data: PrismaLinkData) -> Result<TypeId, super::Error>;
    fn prisma_migration(operation: PrismaMigrationOperation) -> Result<FuncParams, super::Error>;
    fn register_temporal_runtime(data: TemporalRuntimeData) -> Result<RuntimeId, super::Error>;
    fn generate_temporal_operation(
        runtime: RuntimeId,
        data: TemporalOperationData,
    ) -> Result<FuncParams, super::Error>;
    fn register_typegate_materializer(
        operation: TypegateOperation,
    ) -> Result<MaterializerId, super::Error>;
    fn register_typegraph_materializer(
        operation: TypegraphOperation,
    ) -> Result<MaterializerId, super::Error>;
    fn register_substantial_runtime(
        data: SubstantialRuntimeData,
    ) -> Result<RuntimeId, super::Error>;
    fn generate_substantial_operation(
        runtime: RuntimeId,
        data: SubstantialOperationData,
    ) -> Result<FuncParams, super::Error>;
    fn register_kv_runtime(data: KvRuntimeData) -> Result<RuntimeId, super::Error>;
    fn kv_operation(
        base: BaseMaterializer,
        data: KvMaterializer,
    ) -> Result<MaterializerId, super::Error>;
    fn register_grpc_runtime(data: GrpcRuntimeData) -> Result<RuntimeId, super::Error>;
    fn call_grpc_method(runtime: RuntimeId, data: GrpcData) -> Result<FuncParams, super::Error>;
}
