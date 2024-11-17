// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type {
  FuncParams,
  MaterializerId,
  RuntimeId,
  TypeId,
} from "./core.d.ts";
import type { UInt } from "./primitives.d.ts";

type Idempotency = boolean;

type Effect =
  | "read"
  | { create: Idempotency }
  | { update: Idempotency }
  | { delete: Idempotency };

type BaseMaterializer = {
  runtime: RuntimeId;
  effect: Effect;
};

type MaterializerDenoFunc = {
  code: string;
  secrets: string[];
};

type MaterializerDenoStatic = {
  value: string;
};

type MaterializerDenoPredefined = {
  name: string;
};

type MaterializerDenoImport = {
  func_name: string;
  module: string;
  deps: string[];
  secrets: string[];
};

type GraphqlRuntimeData = {
  endpoint: string;
};

type MaterializerGraphqlQuery = {
  path?: string[];
};

type HttpRuntimeData = {
  endpoint: string;
  cert_secret?: string;
  basic_auth_secret?: string;
};

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type MaterializerHttpRequest = {
  method: HttpMethod;
  path: string;
  content_type?: string;
  header_prefix?: string;
  query_fields?: string[];
  rename_fields?: [string, string][];
  body_fields?: string[];
  auth_token_field?: string;
};

type MaterializerPythonDef = {
  runtime: RuntimeId;
  name: string;
  function: string;
};

type MaterializerPythonLambda = {
  runtime: RuntimeId;
  function: string;
};

type MaterializerPythonModule = {
  runtime: RuntimeId;
  file: string;
  deps: string[];
};

type MaterializerPythonImport = {
  module: UInt;
  func_name: string;
  secrets: string[];
};

type RandomRuntimeData = {
  seed?: UInt;
  reset?: string;
};

type MaterializerRandom = {
  runtime: RuntimeId;
};

type WasmRuntimeData = {
  wasm_artifact: string;
};

type MaterializerWasmReflectedFunc = {
  func_name: string;
};

type MaterializerWasmWireHandler = {
  func_name: string;
};

type PrismaRuntimeData = {
  name: string;
  connection_string_secret: string;
};

type PrismaLinkData = {
  target_type: TypeId;
  relationship_name?: string;
  foreign_key?: boolean;
  target_field?: string;
  unique?: boolean;
};

type PrismaMigrationOperation =
  | "diff"
  | "create"
  | "apply"
  | "deploy"
  | "reset";

type TemporalRuntimeData = {
  name: string;
  host_secret: string;
  namespace_secret?: string;
};

type TemporalOperationType =
  | "start_workflow"
  | "signal_workflow"
  | "query_workflow"
  | "describe_workflow";

type TemporalOperationData = {
  mat_arg?: string;
  func_arg?: TypeId;
  func_out?: TypeId;
  operation: TemporalOperationType;
};

type TypegateOperation =
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
  | "query_prisma_model";

type TypegraphOperation = "resolver" | "get_type" | "get_schema";

type RedisBackend = {
  connection_string_secret: string;
};

type SubstantialBackend = "memory" | "fs" | { redis: RedisBackend };

type WorkflowKind = "python" | "deno";

type WorkflowFileDescription = {
  workflows: string[];
  file: string;
  deps: string[];
  kind: WorkflowKind;
};

type SubstantialRuntimeData = {
  backend: SubstantialBackend;
  file_descriptions: WorkflowFileDescription[];
};

type SubstantialStartData = {
  func_arg?: TypeId;
  secrets: string[];
};

type SubstantialOperationData =
  | { start: SubstantialStartData }
  | { start_raw: SubstantialStartData }
  | "stop"
  | { send: TypeId }
  | "send_raw"
  | "resources"
  | { results: TypeId }
  | "results_raw"
  | "internal_link_parent_child";

type KvRuntimeData = {
  url: string;
};

type KvMaterializer = "get" | "set" | "delete" | "keys" | "values";

type GrpcRuntimeData = {
  proto_file: string;
  endpoint: string;
};

type GrpcData = {
  method: string;
};

type get_deno_runtime = () => RuntimeId;

type register_deno_func = (
  data: MaterializerDenoFunc,
  effect: Effect,
) => MaterializerId;

type register_deno_static = (
  data: MaterializerDenoStatic,
  type_id: TypeId,
) => MaterializerId;

type get_predefined_deno_func = (
  data: MaterializerDenoPredefined,
) => MaterializerId;

type import_deno_function = (
  data: MaterializerDenoImport,
  effect: Effect,
) => MaterializerId;

type register_graphql_runtime = (data: GraphqlRuntimeData) => RuntimeId;

type graphql_query = (
  base: BaseMaterializer,
  data: MaterializerGraphqlQuery,
) => MaterializerId;

type graphql_mutation = (
  base: BaseMaterializer,
  data: MaterializerGraphqlQuery,
) => MaterializerId;

type register_http_runtime = (data: HttpRuntimeData) => RuntimeId;

type http_request = (
  base: BaseMaterializer,
  data: MaterializerHttpRequest,
) => MaterializerId;

type register_python_runtime = () => RuntimeId;

type from_python_lambda = (
  base: BaseMaterializer,
  data: MaterializerPythonLambda,
) => MaterializerId;

type from_python_def = (
  base: BaseMaterializer,
  data: MaterializerPythonDef,
) => MaterializerId;

type from_python_module = (
  base: BaseMaterializer,
  data: MaterializerPythonModule,
) => MaterializerId;

type from_python_import = (
  base: BaseMaterializer,
  data: MaterializerPythonImport,
) => MaterializerId;

type register_random_runtime = (data: RandomRuntimeData) => MaterializerId;

type create_random_mat = (
  base: BaseMaterializer,
  data: MaterializerRandom,
) => MaterializerId;

type register_wasm_reflected_runtime = (data: WasmRuntimeData) => RuntimeId;

type from_wasm_reflected_func = (
  base: BaseMaterializer,
  data: MaterializerWasmReflectedFunc,
) => MaterializerId;

type register_wasm_wire_runtime = (data: WasmRuntimeData) => RuntimeId;

type from_wasm_wire_handler = (
  base: BaseMaterializer,
  data: MaterializerWasmWireHandler,
) => MaterializerId;

type register_prisma_runtime = (data: PrismaRuntimeData) => RuntimeId;

type prisma_find_unique = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_find_many = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_find_first = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_aggregate = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_group_by = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_create_one = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_create_many = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_update_one = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_update_many = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_upsert_one = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_delete_one = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_delete_many = (runtime: RuntimeId, model: TypeId) => FuncParams;

type prisma_execute = (
  runtime: RuntimeId,
  query: string,
  param: TypeId,
  effect: Effect,
) => FuncParams;

type prisma_query_raw = (
  runtime: RuntimeId,
  query: string,
  out: TypeId,
  param?: TypeId,
) => FuncParams;

type prisma_link = (data: PrismaLinkData) => TypeId;

type prisma_migration = (operation: PrismaMigrationOperation) => FuncParams;

type register_temporal_runtime = (data: TemporalRuntimeData) => RuntimeId;

type generate_temporal_operation = (
  runtime: RuntimeId,
  data: TemporalOperationData,
) => FuncParams;

type register_typegate_materializer = (
  operation: TypegateOperation,
) => MaterializerId;

type register_typegraph_materializer = (
  operation: TypegraphOperation,
) => MaterializerId;

type register_substantial_runtime = (data: SubstantialRuntimeData) => RuntimeId;

type generate_substantial_operation = (
  runtime: RuntimeId,
  data: SubstantialOperationData,
) => FuncParams;

type register_kv_runtime = (data: KvRuntimeData) => RuntimeId;

type kv_operation = (
  base: BaseMaterializer,
  data: KvMaterializer,
) => MaterializerId;

type register_grpc_runtime = (data: GrpcRuntimeData) => RuntimeId;

type call_grpc_method = (runtime: RuntimeId, data: GrpcData) => FuncParams;

export type {
  Idempotency,
  Effect,
  BaseMaterializer,
  MaterializerDenoFunc,
  MaterializerDenoStatic,
  MaterializerDenoPredefined,
  MaterializerDenoImport,
  GraphqlRuntimeData,
  MaterializerGraphqlQuery,
  HttpRuntimeData,
  HttpMethod,
  MaterializerHttpRequest,
  MaterializerPythonDef,
  MaterializerPythonLambda,
  MaterializerPythonModule,
  MaterializerPythonImport,
  RandomRuntimeData,
  MaterializerRandom,
  WasmRuntimeData,
  MaterializerWasmReflectedFunc,
  MaterializerWasmWireHandler,
  PrismaRuntimeData,
  PrismaLinkData,
  PrismaMigrationOperation,
  TemporalRuntimeData,
  TemporalOperationType,
  TemporalOperationData,
  TypegateOperation,
  TypegraphOperation,
  RedisBackend,
  SubstantialBackend,
  WorkflowKind,
  WorkflowFileDescription,
  SubstantialRuntimeData,
  SubstantialOperationData,
  KvRuntimeData,
  KvMaterializer,
  GrpcRuntimeData,
  GrpcData,
  get_deno_runtime,
  register_deno_func,
  register_deno_static,
  get_predefined_deno_func,
  import_deno_function,
  register_graphql_runtime,
  graphql_query,
  graphql_mutation,
  register_http_runtime,
  http_request,
  register_python_runtime,
  from_python_lambda,
  from_python_def,
  from_python_module,
  from_python_import,
  register_random_runtime,
  create_random_mat,
  register_wasm_reflected_runtime,
  register_wasm_wire_runtime,
  from_wasm_reflected_func,
  from_wasm_wire_handler,
  register_prisma_runtime,
  prisma_find_unique,
  prisma_find_many,
  prisma_find_first,
  prisma_aggregate,
  prisma_group_by,
  prisma_create_one,
  prisma_create_many,
  prisma_update_one,
  prisma_update_many,
  prisma_upsert_one,
  prisma_delete_one,
  prisma_delete_many,
  prisma_execute,
  prisma_query_raw,
  prisma_link,
  prisma_migration,
  register_temporal_runtime,
  generate_temporal_operation,
  register_typegate_materializer,
  register_typegraph_materializer,
  register_substantial_runtime,
  generate_substantial_operation,
  register_kv_runtime,
  kv_operation,
  register_grpc_runtime,
  call_grpc_method,
};
