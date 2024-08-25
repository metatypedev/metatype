// interfaces begin

// src/gen/interfaces/metatype-typegraph-aws.d.ts
export namespace MetatypeTypegraphAws {
  export function registerS3Runtime(data: S3RuntimeData): RuntimeId;
  export function s3PresignGet(
    runtime: RuntimeId,
    data: S3PresignGetParams,
  ): MaterializerId;
  export function s3PresignPut(
    runtime: RuntimeId,
    data: S3PresignPutParams,
  ): MaterializerId;
  export function s3List(runtime: RuntimeId, bucket: string): MaterializerId;
  export function s3Upload(runtime: RuntimeId, bucket: string): MaterializerId;
  export function s3UploadAll(
    runtime: RuntimeId,
    bucket: string,
  ): MaterializerId;
}
// import type { Error } from './metatype-typegraph-core.d.ts';
// export { Error };
// import type { RuntimeId } from './metatype-typegraph-core.d.ts';
// export { RuntimeId };
// import type { MaterializerId } from './metatype-typegraph-core.d.ts';
// export { MaterializerId };
export interface S3RuntimeData {
  hostSecret: string;
  regionSecret: string;
  accessKeySecret: string;
  secretKeySecret: string;
  pathStyleSecret: string;
}
export interface S3PresignGetParams {
  bucket: string;
  expirySecs?: number;
}
export interface S3PresignPutParams {
  bucket: string;
  expirySecs?: number;
  contentType?: string;
}

// src/gen/interfaces/metatype-typegraph-core.d.ts
export namespace MetatypeTypegraphCore {
  export function initTypegraph(params: TypegraphInitParams): void;
  export function serializeTypegraph(
    params: SerializeParams,
  ): [string, Artifact[]];
  export function withInjection(typeId: TypeId, injection: string): TypeId;
  export function refb(name: string, attributes: [string, string][]): TypeId;
  export function integerb(data: TypeInteger, base: TypeBase): TypeId;
  export function floatb(data: TypeFloat, base: TypeBase): TypeId;
  export function booleanb(base: TypeBase): TypeId;
  export function stringb(data: TypeString, base: TypeBase): TypeId;
  export function fileb(data: TypeFile, base: TypeBase): TypeId;
  export function listb(data: TypeList, base: TypeBase): TypeId;
  export function optionalb(data: TypeOptional, base: TypeBase): TypeId;
  export function unionb(data: TypeUnion, base: TypeBase): TypeId;
  export function eitherb(data: TypeEither, base: TypeBase): TypeId;
  export function structb(data: TypeStruct, base: TypeBase): TypeId;
  export function extendStruct(tpe: TypeId, props: [string, TypeId][]): TypeId;
  export function getTypeRepr(id: TypeId): string;
  export function funcb(data: TypeFunc): TypeId;
  export function getTransformData(
    resolverInput: TypeId,
    transformTree: string,
  ): TransformData;
  export function registerPolicy(pol: Policy): PolicyId;
  export function withPolicy(typeId: TypeId, policyChain: PolicySpec[]): TypeId;
  export function getPublicPolicy(): [PolicyId, string];
  export function getInternalPolicy(): [PolicyId, string];
  export function registerContextPolicy(
    key: string,
    check: ContextCheck,
  ): [PolicyId, string];
  export function renameType(tpe: TypeId, newName: string): TypeId;
  export function expose(
    fns: [string, TypeId][],
    defaultPolicy: PolicySpec[] | undefined,
  ): void;
  export function setSeed(seed: number | undefined): void;
}
export interface Error {
  stack: string[];
}
export interface Cors {
  allowOrigin: string[];
  allowHeaders: string[];
  exposeHeaders: string[];
  allowMethods: string[];
  allowCredentials: boolean;
  maxAgeSec?: number;
}
export interface Rate {
  windowLimit: number;
  windowSec: number;
  queryLimit: number;
  contextIdentifier?: string;
  localExcess: number;
}
export interface TypegraphInitParams {
  name: string;
  dynamic?: boolean;
  path: string;
  prefix?: string;
  cors: Cors;
  rate?: Rate;
}
export interface Artifact {
  path: string;
  hash: string;
  size: number;
}
export interface MigrationAction {
  apply: boolean;
  create: boolean;
  reset: boolean;
}
export interface PrismaMigrationConfig {
  migrationsDir: string;
  migrationActions: [string, MigrationAction][];
  defaultMigrationAction: MigrationAction;
}
export interface SerializeParams {
  typegraphPath: string;
  prefix?: string;
  artifactResolution: boolean;
  codegen: boolean;
  prismaMigration: PrismaMigrationConfig;
  pretty: boolean;
}

export interface TypeBase {
  name?: string;
  runtimeConfig?: [string, string][];
  asId: boolean;
}
export interface TypeProxy {
  name: string;
  extras: [string, string][];
}
export interface TypeInteger {
  min?: number;
  max?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  enumeration?: Int32Array;
}
export interface TypeFloat {
  min?: number;
  max?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  enumeration?: Float64Array;
}
export interface TypeString {
  min?: number;
  max?: number;
  format?: string;
  pattern?: string;
  enumeration?: string[];
}
export interface TypeFile {
  min?: number;
  max?: number;
  allow?: string[];
}
export interface TypeList {
  of: TypeId;
  min?: number;
  max?: number;
  uniqueItems?: boolean;
}
export interface TypeOptional {
  of: TypeId;
  defaultItem?: string;
}
export interface TypeUnion {
  variants: Uint32Array;
}
export interface TypeEither {
  variants: Uint32Array;
}
export interface TypeStruct {
  props: [string, TypeId][];
  additionalProps: boolean;
  min?: number;
  max?: number;
  enumeration?: string[];
}
export type ValueSource =
  | ValueSourceRaw
  | ValueSourceContext
  | ValueSourceSecret
  | ValueSourceParent
  | ValueSourceParam;
export interface ValueSourceRaw {
  tag: "raw";
  val: string;
}
export interface ValueSourceContext {
  tag: "context";
  val: string;
}
export interface ValueSourceSecret {
  tag: "secret";
  val: string;
}
export interface ValueSourceParent {
  tag: "parent";
  val: string;
}
export interface ValueSourceParam {
  tag: "param";
  val: string;
}
export interface ParameterTransform {
  resolverInput: TypeId;
  transformTree: string;
}
export interface TransformData {
  queryInput: TypeId;
  parameterTransform: ParameterTransform;
}
export type PolicyId = number;
export interface PolicyPerEffect {
  read?: PolicyId;
  create?: PolicyId;
  update?: PolicyId;
  "delete"?: PolicyId;
}
export type PolicySpec = PolicySpecSimple | PolicySpecPerEffect;
export interface PolicySpecSimple {
  tag: "simple";
  val: PolicyId;
}
export interface PolicySpecPerEffect {
  tag: "per-effect";
  val: PolicyPerEffect;
}
export type ContextCheck =
  | ContextCheckNotNull
  | ContextCheckValue
  | ContextCheckPattern;
export interface ContextCheckNotNull {
  tag: "not-null";
}
export interface ContextCheckValue {
  tag: "value";
  val: string;
}
export interface ContextCheckPattern {
  tag: "pattern";
  val: string;
}
export type RuntimeId = number;
export type MaterializerId = number;
export interface TypeFunc {
  inp: TypeId;
  parameterTransform?: ParameterTransform;
  out: TypeId;
  mat: MaterializerId;
  rateCalls: boolean;
  rateWeight?: number;
}
export interface Policy {
  name: string;
  materializer: MaterializerId;
}
export interface FuncParams {
  inp: TypeId;
  out: TypeId;
  mat: MaterializerId;
}

// src/gen/interfaces/metatype-typegraph-host.d.ts
export namespace MetatypeTypegraphHost {
  export function print(s: string): void;
  export function expandPath(root: string, exclude: string[]): string[];
  export function pathExists(path: string): boolean;
  export function readFile(path: string): Uint8Array;
  export function writeFile(path: string, data: Uint8Array): void;
}

// src/gen/interfaces/metatype-typegraph-runtimes.d.ts
export namespace MetatypeTypegraphRuntimes {
  export function getDenoRuntime(): RuntimeId;
  export function registerDenoFunc(
    data: MaterializerDenoFunc,
    effect: Effect,
  ): MaterializerId;
  export function registerDenoStatic(
    data: MaterializerDenoStatic,
    typeId: TypeId,
  ): MaterializerId;
  export function getPredefinedDenoFunc(
    data: MaterializerDenoPredefined,
  ): MaterializerId;
  export function importDenoFunction(
    data: MaterializerDenoImport,
    effect: Effect,
  ): MaterializerId;
  export function registerGraphqlRuntime(data: GraphqlRuntimeData): RuntimeId;
  export function graphqlQuery(
    base: BaseMaterializer,
    data: MaterializerGraphqlQuery,
  ): MaterializerId;
  export function graphqlMutation(
    base: BaseMaterializer,
    data: MaterializerGraphqlQuery,
  ): MaterializerId;
  export function registerHttpRuntime(data: HttpRuntimeData): RuntimeId;
  export function httpRequest(
    base: BaseMaterializer,
    data: MaterializerHttpRequest,
  ): MaterializerId;
  export function registerPythonRuntime(): RuntimeId;
  export function fromPythonLambda(
    base: BaseMaterializer,
    data: MaterializerPythonLambda,
  ): MaterializerId;
  export function fromPythonDef(
    base: BaseMaterializer,
    data: MaterializerPythonDef,
  ): MaterializerId;
  export function fromPythonModule(
    base: BaseMaterializer,
    data: MaterializerPythonModule,
  ): MaterializerId;
  export function fromPythonImport(
    base: BaseMaterializer,
    data: MaterializerPythonImport,
  ): MaterializerId;
  export function registerRandomRuntime(
    data: RandomRuntimeData,
  ): MaterializerId;
  export function createRandomMat(
    base: BaseMaterializer,
    data: MaterializerRandom,
  ): MaterializerId;
  export function registerWasmReflectedRuntime(
    data: WasmRuntimeData,
  ): RuntimeId;
  export function fromWasmReflectedFunc(
    base: BaseMaterializer,
    data: MaterializerWasmReflectedFunc,
  ): MaterializerId;
  export function registerWasmWireRuntime(data: WasmRuntimeData): RuntimeId;
  export function fromWasmWireHandler(
    base: BaseMaterializer,
    data: MaterializerWasmWireHandler,
  ): MaterializerId;
  export function registerPrismaRuntime(data: PrismaRuntimeData): RuntimeId;
  export function prismaFindUnique(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaFindMany(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaFindFirst(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaAggregate(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaCount(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaGroupBy(runtime: RuntimeId, model: TypeId): FuncParams;
  export function prismaCreateOne(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaCreateMany(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaUpdateOne(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaUpdateMany(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaUpsertOne(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaDeleteOne(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaDeleteMany(
    runtime: RuntimeId,
    model: TypeId,
  ): FuncParams;
  export function prismaExecute(
    runtime: RuntimeId,
    query: string,
    param: TypeId,
    effect: Effect,
  ): FuncParams;
  export function prismaQueryRaw(
    runtime: RuntimeId,
    query: string,
    param: TypeId | undefined,
    out: TypeId,
  ): FuncParams;
  export function prismaLink(data: PrismaLinkData): TypeId;
  export function prismaMigration(
    operation: PrismaMigrationOperation,
  ): FuncParams;
  export function registerTemporalRuntime(data: TemporalRuntimeData): RuntimeId;
  export function generateTemporalOperation(
    runtime: RuntimeId,
    data: TemporalOperationData,
  ): FuncParams;
  export function registerTypegateMaterializer(
    operation: TypegateOperation,
  ): MaterializerId;
  export function registerTypegraphMaterializer(
    operation: TypegraphOperation,
  ): MaterializerId;
  export function registerSubstantialRuntime(
    data: SubstantialRuntimeData,
  ): RuntimeId;
  export function generateSubstantialOperation(
    runtime: RuntimeId,
    data: SubstantialOperationData,
  ): FuncParams;
  export function registerKvRuntime(data: KvRuntimeData): RuntimeId;
  export function kvOperation(
    base: BaseMaterializer,
    data: KvMaterializer,
  ): MaterializerId;
}
// import type { Error } from './metatype-typegraph-core.d.ts';
// export { Error };
// import type { TypeId } from './metatype-typegraph-core.d.ts';
// export { TypeId };
// import type { FuncParams } from './metatype-typegraph-core.d.ts';
// export { FuncParams };
// import type { RuntimeId } from './metatype-typegraph-core.d.ts';
// export { RuntimeId };
// import type { MaterializerId } from './metatype-typegraph-core.d.ts';
// export { MaterializerId };
// import type { Artifact } from './metatype-typegraph-core.d.ts';
// export { Artifact };
export type Idempotency = boolean;
export type Effect = EffectRead | EffectCreate | EffectUpdate | EffectDelete;
export interface EffectRead {
  tag: "read";
}
export interface EffectCreate {
  tag: "create";
  val: Idempotency;
}
export interface EffectUpdate {
  tag: "update";
  val: Idempotency;
}
export interface EffectDelete {
  tag: "delete";
  val: Idempotency;
}
export interface BaseMaterializer {
  runtime: RuntimeId;
  effect: Effect;
}
export interface MaterializerDenoFunc {
  code: string;
  secrets: string[];
}
export interface MaterializerDenoStatic {
  value: string;
}
export interface MaterializerDenoPredefined {
  name: string;
}
export interface MaterializerDenoImport {
  funcName: string;
  module: string;
  deps: string[];
  secrets: string[];
}
export interface GraphqlRuntimeData {
  endpoint: string;
}
export interface MaterializerGraphqlQuery {
  path?: string[];
}
export interface HttpRuntimeData {
  endpoint: string;
  certSecret?: string;
  basicAuthSecret?: string;
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
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export interface MaterializerHttpRequest {
  method: HttpMethod;
  path: string;
  contentType?: string;
  headerPrefix?: string;
  queryFields?: string[];
  renameFields?: [string, string][];
  bodyFields?: string[];
  authTokenField?: string;
}
export interface MaterializerPythonDef {
  runtime: RuntimeId;
  name: string;
  fn: string;
}
export interface MaterializerPythonLambda {
  runtime: RuntimeId;
  fn: string;
}
export interface MaterializerPythonModule {
  runtime: RuntimeId;
  file: string;
  deps: string[];
}
export interface MaterializerPythonImport {
  module: number;
  funcName: string;
  secrets: string[];
}
export interface RandomRuntimeData {
  seed?: number;
  reset?: string;
}
export interface MaterializerRandom {
  runtime: RuntimeId;
}
export interface WasmRuntimeData {
  wasmArtifact: string;
}
export interface MaterializerWasmReflectedFunc {
  funcName: string;
}
export interface MaterializerWasmWireHandler {
  funcName: string;
}
export interface PrismaRuntimeData {
  name: string;
  connectionStringSecret: string;
}
export interface PrismaLinkData {
  targetType: TypeId;
  relationshipName?: string;
  foreignKey?: boolean;
  targetField?: string;
  unique?: boolean;
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
export type PrismaMigrationOperation =
  | "diff"
  | "create"
  | "apply"
  | "deploy"
  | "reset";
export interface TemporalRuntimeData {
  name: string;
  hostSecret: string;
  namespaceSecret?: string;
}
export type TemporalOperationType =
  | TemporalOperationTypeStartWorkflow
  | TemporalOperationTypeSignalWorkflow
  | TemporalOperationTypeQueryWorkflow
  | TemporalOperationTypeDescribeWorkflow;
export interface TemporalOperationTypeStartWorkflow {
  tag: "start-workflow";
}
export interface TemporalOperationTypeSignalWorkflow {
  tag: "signal-workflow";
}
export interface TemporalOperationTypeQueryWorkflow {
  tag: "query-workflow";
}
export interface TemporalOperationTypeDescribeWorkflow {
  tag: "describe-workflow";
}
export interface TemporalOperationData {
  matArg?: string;
  funcArg?: TypeId;
  funcOut?: TypeId;
  operation: TemporalOperationType;
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
export type TypegateOperation =
  | "list-typegraphs"
  | "find-typegraph"
  | "add-typegraph"
  | "remove-typegraphs"
  | "get-serialized-typegraph"
  | "get-arg-info-by-path"
  | "find-available-operations"
  | "find-prisma-models"
  | "raw-prisma-read"
  | "raw-prisma-create"
  | "raw-prisma-update"
  | "raw-prisma-delete"
  | "query-prisma-model";
/**
 * # Variants
 *
 * ## `"resolver"`
 *
 * ## `"get-type"`
 *
 * ## `"get-schema"`
 */
export type TypegraphOperation = "resolver" | "get-type" | "get-schema";
export interface SubstantialRuntimeData {
  endpoint: string;
  basicAuthSecret?: string;
}
/**
 * # Variants
 *
 * ## `"python"`
 */
export type WorkflowKind = "python";
export interface Workflow {
  name: string;
  file: string;
  deps: string[];
  kind: WorkflowKind;
}
export type SubstantialOperationType =
  | SubstantialOperationTypeStart
  | SubstantialOperationTypeStop
  | SubstantialOperationTypeSend;
export interface SubstantialOperationTypeStart {
  tag: "start";
  val: Workflow;
}
export interface SubstantialOperationTypeStop {
  tag: "stop";
  val: Workflow;
}
export interface SubstantialOperationTypeSend {
  tag: "send";
  val: Workflow;
}
export interface SubstantialOperationData {
  funcArg?: TypeId;
  operation: SubstantialOperationType;
}
export interface KvRuntimeData {
  url: string;
}
/**
 * # Variants
 *
 * ## `"get"`
 *
 * ## `"set"`
 *
 * ## `"delete"`
 *
 * ## `"keys"`
 *
 * ## `"values"`
 */
export type KvMaterializer = "get" | "set" | "delete" | "keys" | "values";

// src/gen/interfaces/metatype-typegraph-utils.d.ts
export namespace MetatypeTypegraphUtils {
  export function genReduceb(supertypeId: TypeId, data: Reduce): TypeId;
  export function addGraphqlEndpoint(graphql: string): number;
  export function addAuth(data: Auth): number;
  export function addRawAuth(data: string): number;
  export function oauth2(serviceName: string, scopes: string): string;
  export function oauth2WithoutProfiler(
    serviceName: string,
    scopes: string,
  ): string;
  export function oauth2WithExtendedProfiler(
    serviceName: string,
    scopes: string,
    extension: string,
  ): string;
  export function oauth2WithCustomProfiler(
    serviceName: string,
    scopes: string,
    profiler: TypeId,
  ): string;
  export function gqlDeployQuery(params: QueryDeployParams): string;
  export function gqlRemoveQuery(tgName: string[]): string;
  export function removeInjections(typeId: TypeId): TypeId;
  export function metagenExec(config: MdkConfig): MdkOutput[];
  export function metagenWriteFiles(
    items: MdkOutput[],
    typegraphDir: string,
  ): void;
}
// import type { Error } from './metatype-typegraph-core.d.ts';
// export { Error };

export interface ReduceValue {
  inherit: boolean;
  payload?: string;
}
export interface ReducePath {
  path: string[];
  value: ReduceValue;
}
export interface Reduce {
  paths: ReducePath[];
}
export type AuthProtocol =
  | AuthProtocolOauth2
  | AuthProtocolJwt
  | AuthProtocolBasic;
export interface AuthProtocolOauth2 {
  tag: "oauth2";
}
export interface AuthProtocolJwt {
  tag: "jwt";
}
export interface AuthProtocolBasic {
  tag: "basic";
}
export interface Auth {
  name: string;
  protocol: AuthProtocol;
  authData: [string, string][];
}
export interface QueryDeployParams {
  tg: string;
  secrets?: [string, string][];
}
export interface MdkConfig {
  workspacePath: string;
  targetName: string;
  configJson: string;
  tgJson: string;
}
export interface MdkOutput {
  path: string;
  content: string;
  overwrite: boolean;
}

// interfaces end

// common

export type TypeId = number;
