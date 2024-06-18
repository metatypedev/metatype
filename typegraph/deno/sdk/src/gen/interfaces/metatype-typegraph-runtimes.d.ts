export namespace MetatypeTypegraphRuntimes {
  export function getDenoRuntime(): RuntimeId;
  export function registerDenoFunc(data: MaterializerDenoFunc, effect: Effect): MaterializerId;
  export function registerDenoStatic(data: MaterializerDenoStatic, typeId: TypeId): MaterializerId;
  export function getPredefinedDenoFunc(data: MaterializerDenoPredefined): MaterializerId;
  export function importDenoFunction(data: MaterializerDenoImport, effect: Effect): MaterializerId;
  export function registerGraphqlRuntime(data: GraphqlRuntimeData): RuntimeId;
  export function graphqlQuery(base: BaseMaterializer, data: MaterializerGraphqlQuery): MaterializerId;
  export function graphqlMutation(base: BaseMaterializer, data: MaterializerGraphqlQuery): MaterializerId;
  export function registerHttpRuntime(data: HttpRuntimeData): RuntimeId;
  export function httpRequest(base: BaseMaterializer, data: MaterializerHttpRequest): MaterializerId;
  export function registerPythonRuntime(): RuntimeId;
  export function fromPythonLambda(base: BaseMaterializer, data: MaterializerPythonLambda): MaterializerId;
  export function fromPythonDef(base: BaseMaterializer, data: MaterializerPythonDef): MaterializerId;
  export function fromPythonModule(base: BaseMaterializer, data: MaterializerPythonModule): MaterializerId;
  export function fromPythonImport(base: BaseMaterializer, data: MaterializerPythonImport): MaterializerId;
  export function registerRandomRuntime(data: RandomRuntimeData): MaterializerId;
  export function createRandomMat(base: BaseMaterializer, data: MaterializerRandom): MaterializerId;
  export function registerWasmReflectedRuntime(data: WasmRuntimeData): RuntimeId;
  export function fromWasmReflectedFunc(base: BaseMaterializer, data: MaterializerWasmReflectedFunc): MaterializerId;
  export function registerWasmWireRuntime(data: WasmRuntimeData): RuntimeId;
  export function fromWasmWireHandler(base: BaseMaterializer, data: MaterializerWasmWireHandler): MaterializerId;
  export function registerPrismaRuntime(data: PrismaRuntimeData): RuntimeId;
  export function prismaFindUnique(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaFindMany(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaFindFirst(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaAggregate(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaCount(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaGroupBy(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaCreateOne(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaCreateMany(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaUpdateOne(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaUpdateMany(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaUpsertOne(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaDeleteOne(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaDeleteMany(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaExecute(runtime: RuntimeId, query: string, param: TypeId, effect: Effect): FuncParams;
  export function prismaQueryRaw(runtime: RuntimeId, query: string, param: TypeId | undefined, out: TypeId): FuncParams;
  export function prismaLink(data: PrismaLinkData): TypeId;
  export function prismaMigration(operation: PrismaMigrationOperation): FuncParams;
  export function registerTemporalRuntime(data: TemporalRuntimeData): RuntimeId;
  export function generateTemporalOperation(runtime: RuntimeId, data: TemporalOperationData): FuncParams;
  export function registerTypegateMaterializer(operation: TypegateOperation): MaterializerId;
  export function registerTypegraphMaterializer(operation: TypegraphOperation): MaterializerId;
}
import type { Error } from './metatype-typegraph-core.js';
export { Error };
import type { TypeId } from './metatype-typegraph-core.js';
export { TypeId };
import type { FuncParams } from './metatype-typegraph-core.js';
export { FuncParams };
import type { RuntimeId } from './metatype-typegraph-core.js';
export { RuntimeId };
import type { MaterializerId } from './metatype-typegraph-core.js';
export { MaterializerId };
import type { Artifact } from './metatype-typegraph-core.js';
export { Artifact };
export type Idempotency = boolean;
export type Effect = EffectRead | EffectCreate | EffectUpdate | EffectDelete;
export interface EffectRead {
  tag: 'read',
}
export interface EffectCreate {
  tag: 'create',
  val: Idempotency,
}
export interface EffectUpdate {
  tag: 'update',
  val: Idempotency,
}
export interface EffectDelete {
  tag: 'delete',
  val: Idempotency,
}
export interface BaseMaterializer {
  runtime: RuntimeId,
  effect: Effect,
}
export interface MaterializerDenoFunc {
  code: string,
  secrets: string[],
}
export interface MaterializerDenoStatic {
  value: string,
}
export interface MaterializerDenoPredefined {
  name: string,
}
export interface MaterializerDenoImport {
  funcName: string,
  module: string,
  deps: string[],
  secrets: string[],
}
export interface GraphqlRuntimeData {
  endpoint: string,
}
export interface MaterializerGraphqlQuery {
  path?: string[],
}
export interface HttpRuntimeData {
  endpoint: string,
  certSecret?: string,
  basicAuthSecret?: string,
}
/**
 * # Variants
 * 
 * ## `"get"`
 * 
 * ## `"post"`
 * 
 * ## `"put"`
 * 
 * ## `"patch"`
 * 
 * ## `"delete"`
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export interface MaterializerHttpRequest {
  method: HttpMethod,
  path: string,
  contentType?: string,
  headerPrefix?: string,
  queryFields?: string[],
  renameFields?: [string, string][],
  bodyFields?: string[],
  authTokenField?: string,
}
export interface MaterializerPythonDef {
  runtime: RuntimeId,
  name: string,
  fn: string,
}
export interface MaterializerPythonLambda {
  runtime: RuntimeId,
  fn: string,
}
export interface MaterializerPythonModule {
  runtime: RuntimeId,
  file: string,
  deps: string[],
}
export interface MaterializerPythonImport {
  module: number,
  funcName: string,
  secrets: string[],
}
export interface RandomRuntimeData {
  seed?: number,
  reset?: string,
}
export interface MaterializerRandom {
  runtime: RuntimeId,
}
export interface WasmRuntimeData {
  wasmArtifact: string,
}
export interface MaterializerWasmReflectedFunc {
  funcName: string,
}
export interface MaterializerWasmWireHandler {
  funcName: string,
}
export interface PrismaRuntimeData {
  name: string,
  connectionStringSecret: string,
}
export interface PrismaLinkData {
  targetType: TypeId,
  relationshipName?: string,
  foreignKey?: boolean,
  targetField?: string,
  unique?: boolean,
}
/**
 * # Variants
 * 
 * ## `"diff"`
 * 
 * ## `"create"`
 * 
 * ## `"apply"`
 * 
 * ## `"deploy"`
 * 
 * ## `"reset"`
 */
export type PrismaMigrationOperation = 'diff' | 'create' | 'apply' | 'deploy' | 'reset';
export interface TemporalRuntimeData {
  name: string,
  hostSecret: string,
  namespaceSecret?: string,
}
export type TemporalOperationType = TemporalOperationTypeStartWorkflow | TemporalOperationTypeSignalWorkflow | TemporalOperationTypeQueryWorkflow | TemporalOperationTypeDescribeWorkflow;
export interface TemporalOperationTypeStartWorkflow {
  tag: 'start-workflow',
}
export interface TemporalOperationTypeSignalWorkflow {
  tag: 'signal-workflow',
}
export interface TemporalOperationTypeQueryWorkflow {
  tag: 'query-workflow',
}
export interface TemporalOperationTypeDescribeWorkflow {
  tag: 'describe-workflow',
}
export interface TemporalOperationData {
  matArg?: string,
  funcArg?: TypeId,
  funcOut?: TypeId,
  operation: TemporalOperationType,
}
/**
 * # Variants
 * 
 * ## `"list-typegraphs"`
 * 
 * ## `"find-typegraph"`
 * 
 * ## `"add-typegraph"`
 * 
 * ## `"remove-typegraphs"`
 * 
 * ## `"get-serialized-typegraph"`
 * 
 * ## `"get-arg-info-by-path"`
 * 
 * ## `"find-available-operations"`
 * 
 * ## `"find-prisma-models"`
 * 
 * ## `"raw-prisma-read"`
 * 
 * ## `"raw-prisma-create"`
 * 
 * ## `"raw-prisma-update"`
 * 
 * ## `"raw-prisma-delete"`
 * 
 * ## `"query-prisma-model"`
 */
export type TypegateOperation = 'list-typegraphs' | 'find-typegraph' | 'add-typegraph' | 'remove-typegraphs' | 'get-serialized-typegraph' | 'get-arg-info-by-path' | 'find-available-operations' | 'find-prisma-models' | 'raw-prisma-read' | 'raw-prisma-create' | 'raw-prisma-update' | 'raw-prisma-delete' | 'query-prisma-model';
/**
 * # Variants
 * 
 * ## `"resolver"`
 * 
 * ## `"get-type"`
 * 
 * ## `"get-schema"`
 */
export type TypegraphOperation = 'resolver' | 'get-type' | 'get-schema';
