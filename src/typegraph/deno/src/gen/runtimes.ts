// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { rpcRequest } from "./client.ts";
import type { FuncParams, MaterializerId, RuntimeId, TypeId } from "./core.ts";

export type Idempotency = boolean;

export type Effect =
  | "read"
  | { create: Idempotency }
  | { update: Idempotency }
  | { delete: Idempotency };

export type BaseMaterializer = {
  runtime: RuntimeId
  effect: Effect
}

export type MaterializerDenoFunc = {
  code: string
  secrets: string[]
}

export type MaterializerDenoStatic = {
  value: string
}

export type MaterializerDenoPredefined = {
  name: string
  param?: string
}

export type MaterializerDenoImport = {
  funcName: string
  module: string
  deps: string[]
  secrets: string[]
}

export type GraphqlRuntimeData = {
  endpoint: string
}

export type MaterializerGraphqlQuery = {
  path?: string[]
}

export type HttpRuntimeData = {
  endpoint: string
  certSecret?: string
  basicAuthSecret?: string
}

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete";

export type MaterializerHttpRequest = {
  method: HttpMethod
  path: string
  contentType?: string
  headerPrefix?: string
  queryFields?: string[]
  renameFields?: [string, string][]
  bodyFields?: string[]
  authTokenField?: string
}

export type MaterializerPythonDef = {
  runtime: RuntimeId
  name: string
  function: string
}

export type MaterializerPythonLambda = {
  runtime: RuntimeId
  function: string
}

export type MaterializerPythonModule = {
  runtime: RuntimeId
  file: string
  deps: string[]
}

export type MaterializerPythonImport = {
  module: number
  funcName: string
  secrets: string[]
}

export type RandomRuntimeData = {
  seed?: number
  reset?: string
}

export type MaterializerRandom = {
  runtime: RuntimeId
}

export type WasmRuntimeData = {
  wasmArtifact: string
}

export type MaterializerWasmReflectedFunc = {
  funcName: string
}

export type MaterializerWasmWireHandler = {
  funcName: string
}

export type PrismaRuntimeData = {
  name: string
  connectionStringSecret: string
}

export type PrismaLinkData = {
  targetType: TypeId
  relationshipName?: string
  foreignKey?: boolean
  targetField?: string
  unique?: boolean
}

export type PrismaMigrationOperation =
  | "diff"
  | "create"
  | "apply"
  | "deploy"
  | "reset";

export type TemporalRuntimeData = {
  name: string
  hostSecret: string
  namespaceSecret?: string
}

export type TemporalOperationType =
  | "start_workflow"
  | "signal_workflow"
  | "query_workflow"
  | "describe_workflow";

export type TemporalOperationData = {
  matArg?: string
  funcArg?: TypeId
  funcOut?: TypeId
  operation: TemporalOperationType
}

export type TypegateOperation =
  | "list_typegraphs"
  | "find_typegraph"
  | "add_typegraph"
  | "remove_typegraphs"
  | "get_serialized_typegraph"
  | "get_arg_info_by_path"
  | "find_available_operations"
  | "find_prisma_models"
  | "raw_prisma_read"
  | "raw_prisma_create"
  | "raw_prisma_update"
  | "raw_prisma_delete"
  | "query_prisma_model"
  | "ping";

export type TypegraphOperation =
  | "resolver"
  | "get_type"
  | "get_schema";

export type RedisBackend = {
  connectionStringSecret: string
}

export type SubstantialBackend =
  | "memory"
  | "fs"
  | { redis: RedisBackend };

export type WorkflowKind =
  | "python"
  | "deno";

export type WorkflowFileDescription = {
  workflows: string[]
  file: string
  deps: string[]
  kind: WorkflowKind
}

export type SubstantialRuntimeData = {
  backend: SubstantialBackend
  fileDescriptions: WorkflowFileDescription[]
}

export type SubstantialStartData = {
  funcArg?: TypeId
  secrets: string[]
}

export type SubstantialOperationData =
  | { start: SubstantialStartData }
  | { startRaw: SubstantialStartData }
  | "stop"
  | { send: TypeId }
  | "send_raw"
  | "resources"
  | { results: TypeId }
  | "results_raw"
  | "internal_link_parent_child"
  | "advanced_filters";

export type KvRuntimeData = {
  url: string
}

export type KvMaterializer =
  | "get"
  | "set"
  | "delete"
  | "keys"
  | "values"
  | "lpush"
  | "rpush"
  | "lpop"
  | "rpop";

export type GrpcRuntimeData = {
  protoFile: string
  endpoint: string
}

export type GrpcData = {
  method: string
}

export function getDenoRuntime(): RuntimeId {
  return rpcRequest("get_deno_runtime", null);
}

export function registerDenoFunc(data: MaterializerDenoFunc, effect: Effect): MaterializerId {
  return rpcRequest("register_deno_func", { data, effect });
}

export function registerDenoStatic(data: MaterializerDenoStatic, type_id: TypeId): MaterializerId {
  return rpcRequest("register_deno_static", { data, type_id });
}

export function getPredefinedDenoFunc(data: MaterializerDenoPredefined): MaterializerId {
  return rpcRequest("get_predefined_deno_func", { data });
}

export function importDenoFunction(data: MaterializerDenoImport, effect: Effect): MaterializerId {
  return rpcRequest("import_deno_function", { data, effect });
}

export function registerGraphqlRuntime(data: GraphqlRuntimeData): RuntimeId {
  return rpcRequest("register_graphql_runtime", { data });
}

export function graphqlQuery(base: BaseMaterializer, data: MaterializerGraphqlQuery): MaterializerId {
  return rpcRequest("graphql_query", { base, data });
}

export function graphqlMutation(base: BaseMaterializer, data: MaterializerGraphqlQuery): MaterializerId {
  return rpcRequest("graphql_mutation", { base, data });
}

export function registerHttpRuntime(data: HttpRuntimeData): RuntimeId {
  return rpcRequest("register_http_runtime", { data });
}

export function httpRequest(base: BaseMaterializer, data: MaterializerHttpRequest): MaterializerId {
  return rpcRequest("http_request", { base, data });
}

export function registerPythonRuntime(): RuntimeId {
  return rpcRequest("register_python_runtime", null);
}

export function fromPythonLambda(base: BaseMaterializer, data: MaterializerPythonLambda): MaterializerId {
  return rpcRequest("from_python_lambda", { base, data });
}

export function fromPythonDef(base: BaseMaterializer, data: MaterializerPythonDef): MaterializerId {
  return rpcRequest("from_python_def", { base, data });
}

export function fromPythonModule(base: BaseMaterializer, data: MaterializerPythonModule): MaterializerId {
  return rpcRequest("from_python_module", { base, data });
}

export function fromPythonImport(base: BaseMaterializer, data: MaterializerPythonImport): MaterializerId {
  return rpcRequest("from_python_import", { base, data });
}

export function registerRandomRuntime(data: RandomRuntimeData): MaterializerId {
  return rpcRequest("register_random_runtime", { data });
}

export function createRandomMat(base: BaseMaterializer, data: MaterializerRandom): MaterializerId {
  return rpcRequest("create_random_mat", { base, data });
}

export function registerWasmReflectedRuntime(data: WasmRuntimeData): RuntimeId {
  return rpcRequest("register_wasm_reflected_runtime", { data });
}

export function fromWasmReflectedFunc(base: BaseMaterializer, data: MaterializerWasmReflectedFunc): MaterializerId {
  return rpcRequest("from_wasm_reflected_func", { base, data });
}

export function registerWasmWireRuntime(data: WasmRuntimeData): RuntimeId {
  return rpcRequest("register_wasm_wire_runtime", { data });
}

export function fromWasmWireHandler(base: BaseMaterializer, data: MaterializerWasmWireHandler): MaterializerId {
  return rpcRequest("from_wasm_wire_handler", { base, data });
}

export function registerPrismaRuntime(data: PrismaRuntimeData): RuntimeId {
  return rpcRequest("register_prisma_runtime", { data });
}

export function prismaFindUnique(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_find_unique", { runtime, model });
}

export function prismaFindMany(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_find_many", { runtime, model });
}

export function prismaFindFirst(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_find_first", { runtime, model });
}

export function prismaAggregate(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_aggregate", { runtime, model });
}

export function prismaGroupBy(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_group_by", { runtime, model });
}

export function prismaCreateOne(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_create_one", { runtime, model });
}

export function prismaCreateMany(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_create_many", { runtime, model });
}

export function prismaUpdateOne(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_update_one", { runtime, model });
}

export function prismaUpdateMany(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_update_many", { runtime, model });
}

export function prismaUpsertOne(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_upsert_one", { runtime, model });
}

export function prismaDeleteOne(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_delete_one", { runtime, model });
}

export function prismaDeleteMany(runtime: RuntimeId, model: TypeId): FuncParams {
  return rpcRequest("prisma_delete_many", { runtime, model });
}

export function prismaExecute(runtime: RuntimeId, query: string, param: TypeId, effect: Effect): FuncParams {
  return rpcRequest("prisma_execute", { runtime, query, param, effect });
}

export function prismaQueryRaw(runtime: RuntimeId, query: string, out: TypeId, param?: TypeId): FuncParams {
  return rpcRequest("prisma_query_raw", { runtime, query, out, param });
}

export function prismaLink(data: PrismaLinkData): TypeId {
  return rpcRequest("prisma_link", { data });
}

export function prismaMigration(operation: PrismaMigrationOperation): FuncParams {
  return rpcRequest("prisma_migration", { operation });
}

export function registerTemporalRuntime(data: TemporalRuntimeData): RuntimeId {
  return rpcRequest("register_temporal_runtime", { data });
}

export function generateTemporalOperation(runtime: RuntimeId, data: TemporalOperationData): FuncParams {
  return rpcRequest("generate_temporal_operation", { runtime, data });
}

export function registerTypegateMaterializer(operation: TypegateOperation): MaterializerId {
  return rpcRequest("register_typegate_materializer", { operation });
}

export function registerTypegraphMaterializer(operation: TypegraphOperation): MaterializerId {
  return rpcRequest("register_typegraph_materializer", { operation });
}

export function registerSubstantialRuntime(data: SubstantialRuntimeData): RuntimeId {
  return rpcRequest("register_substantial_runtime", { data });
}

export function generateSubstantialOperation(runtime: RuntimeId, data: SubstantialOperationData): FuncParams {
  return rpcRequest("generate_substantial_operation", { runtime, data });
}

export function registerKvRuntime(data: KvRuntimeData): RuntimeId {
  return rpcRequest("register_kv_runtime", { data });
}

export function kvOperation(base: BaseMaterializer, data: KvMaterializer): MaterializerId {
  return rpcRequest("kv_operation", { base, data });
}

export function registerGrpcRuntime(data: GrpcRuntimeData): RuntimeId {
  return rpcRequest("register_grpc_runtime", { data });
}

export function callGrpcMethod(runtime: RuntimeId, data: GrpcData): FuncParams {
  return rpcRequest("call_grpc_method", { runtime, data });
}