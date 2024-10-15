use super::core::{RuntimeId, TypeId};

pub type Idempotency = bool;

#[derive(Debug, Clone)]
pub enum Effect {
    Read,
    Create(Idempotency),
    Update(Idempotency),
    Delete(Idempotency),
}

#[derive(Debug, Clone)]
pub struct BaseMaterializer {
    pub runtime: RuntimeId,
    pub effect: Effect,
}

// deno
#[derive(Debug, Clone)]
pub struct MaterializerDenoFunc {
    pub code: String,
    pub secrets: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct MaterializerDenoStatic {
    pub value: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerDenoPredefined {
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerDenoImport {
    pub func_name: String,
    pub module: String,
    pub deps: Vec<String>,
    pub secrets: Vec<String>,
}

// graphql
#[derive(Debug, Clone)]
pub struct GraphqlRuntimeData {
    pub endpoint: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerGraphqlQuery {
    pub path: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct HttpRuntimeData {
    pub endpoint: String,
    pub cert_secret: Option<String>,
    pub basic_auth_secret: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
}

#[derive(Debug, Clone)]
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

// python
#[derive(Debug, Clone)]
pub struct MaterializerPythonDef {
    pub runtime: RuntimeId,
    pub name: String,
    pub fn_: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerPythonLambda {
    pub runtime: RuntimeId,
    pub fn_: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerPythonModule {
    pub runtime: RuntimeId,
    pub file: String,
    pub deps: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct MaterializerPythonImport {
    pub module: u32,
    pub func_name: String,
    pub secrets: Vec<String>,
}

// TODO: host:port

// random
#[derive(Debug, Clone)]
pub struct RandomRuntimeData {
    pub seed: Option<u32>,
    pub reset: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MaterializerRandom {
    pub runtime: RuntimeId,
}

// wasm
#[derive(Debug, Clone)]
pub struct WasmRuntimeData {
    pub wasm_artifact: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerWasmReflectedFunc {
    pub func_name: String,
}

#[derive(Debug, Clone)]
pub struct MaterializerWasmWireHandler {
    pub func_name: String,
}

// prisma
#[derive(Debug, Clone)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub connection_string_secret: String,
}

#[derive(Debug, Clone)]
pub struct PrismaLinkData {
    pub target_type: TypeId,
    pub relationship_name: Option<String>,
    pub foreign_key: Option<bool>,
    pub target_field: Option<String>,
    pub unique: Option<bool>,
}

// prisma_migrate
#[derive(Debug, Clone)]
pub enum PrismaMigrationOperation {
    Diff,
    Create,
    Apply,
    Deploy,
    Reset,
}

// temporal
#[derive(Debug, Clone)]
pub struct TemporalRuntimeData {
    pub name: String,
    pub host_secret: String,
    pub namespace_secret: Option<String>,
}

#[derive(Debug, Clone)]
pub enum TemporalOperationType {
    StartWorkflow,
    SignalWorkflow,
    QueryWorkflow,
    DescribeWorkflow,
}

#[derive(Debug, Clone)]
pub struct TemporalOperationData {
    pub mat_arg: Option<String>,
    pub func_arg: Option<TypeId>,
    pub func_out: Option<TypeId>,
    pub operation: TemporalOperationType,
}

// typegate
pub enum TypegateOperation {
    VecTypegraphs,
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

// typegraph  (introspection)
#[derive(Debug, Clone)]
pub enum TypegraphOperation {
    Resolver,
    GetType,
    GetSchema,
}

// substantial
#[derive(Debug, Clone)]
pub struct RedisBackend {
    pub connection_string_secret: String,
}

#[derive(Debug, Clone)]
pub enum SubstantialBackend {
    Memory,
    Fs,
    Redis(RedisBackend),
}

#[derive(Debug, Clone)]
pub struct SubstantialRuntimeData {
    pub backend: SubstantialBackend,
}

#[derive(Debug, Clone)]
pub enum WorkflowKind {
    Python,
    Deno,
}

#[derive(Debug, Clone)]
pub struct Workflow {
    pub name: String,
    pub file: String,
    pub deps: Vec<String>,
    pub kind: WorkflowKind,
}

#[derive(Debug, Clone)]
pub enum SubstantialOperationType {
    Start(Workflow),
    Stop(Workflow),
    Send(Workflow),
    Resources(Workflow),
    Results(Workflow),
}

#[derive(Debug, Clone)]
pub struct SubstantialOperationData {
    pub func_arg: Option<TypeId>,
    pub func_out: Option<TypeId>,
    pub operation: SubstantialOperationType,
}

// kv
#[derive(Debug, Clone)]
pub struct KvRuntimeData {
    pub url: String,
}

#[derive(Debug, Clone)]
pub enum KvMaterializer {
    Get,
    Set,
    Delete,
    Keys,
    Values,
}

// Grpc
#[derive(Debug, Clone)]
pub struct GrpcRuntimeData {
    pub proto_file: String,
    pub endpoint: String,
}

#[derive(Debug, Clone)]
pub struct GrpcData {
    pub method: String,
}
