export namespace MetatypeTypegraphCore {
  export function initTypegraph(params: TypegraphInitParams): void;
  export function serializeTypegraph(params: SerializeParams): [string, Artifact[]];
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
  export function getTransformData(resolverInput: TypeId, transformTree: string): TransformData;
  export function registerPolicy(pol: Policy): PolicyId;
  export function withPolicy(typeId: TypeId, policyChain: PolicySpec[]): TypeId;
  export function getPublicPolicy(): [PolicyId, string];
  export function getInternalPolicy(): [PolicyId, string];
  export function registerContextPolicy(key: string, check: ContextCheck): [PolicyId, string];
  export function renameType(tpe: TypeId, newName: string): TypeId;
  export function expose(fns: [string, TypeId][], defaultPolicy: PolicySpec[] | undefined): void;
  export function setSeed(seed: number | undefined): void;
}
export interface Error {
  stack: string[],
}
export interface Cors {
  allowOrigin: string[],
  allowHeaders: string[],
  exposeHeaders: string[],
  allowMethods: string[],
  allowCredentials: boolean,
  maxAgeSec?: number,
}
export interface Rate {
  windowLimit: number,
  windowSec: number,
  queryLimit: number,
  contextIdentifier?: string,
  localExcess: number,
}
export interface TypegraphInitParams {
  name: string,
  dynamic?: boolean,
  path: string,
  prefix?: string,
  cors: Cors,
  rate?: Rate,
}
export interface Artifact {
  path: string,
  hash: string,
  size: number,
}
export interface MigrationAction {
  apply: boolean,
  create: boolean,
  reset: boolean,
}
export interface PrismaMigrationConfig {
  migrationsDir: string,
  migrationActions: [string, MigrationAction][],
  defaultMigrationAction: MigrationAction,
}
export interface SerializeParams {
  typegraphPath: string,
  prefix?: string,
  artifactResolution: boolean,
  codegen: boolean,
  prismaMigration: PrismaMigrationConfig,
  pretty: boolean,
}
export type TypeId = number;
export interface TypeBase {
  name?: string,
  runtimeConfig?: [string, string][],
  asId: boolean,
}
export interface TypeProxy {
  name: string,
  extras: [string, string][],
}
export interface TypeInteger {
  min?: number,
  max?: number,
  exclusiveMinimum?: number,
  exclusiveMaximum?: number,
  multipleOf?: number,
  enumeration?: Int32Array,
}
export interface TypeFloat {
  min?: number,
  max?: number,
  exclusiveMinimum?: number,
  exclusiveMaximum?: number,
  multipleOf?: number,
  enumeration?: Float64Array,
}
export interface TypeString {
  min?: number,
  max?: number,
  format?: string,
  pattern?: string,
  enumeration?: string[],
}
export interface TypeFile {
  min?: number,
  max?: number,
  allow?: string[],
}
export interface TypeList {
  of: TypeId,
  min?: number,
  max?: number,
  uniqueItems?: boolean,
}
export interface TypeOptional {
  of: TypeId,
  defaultItem?: string,
}
export interface TypeUnion {
  variants: Uint32Array,
}
export interface TypeEither {
  variants: Uint32Array,
}
export interface TypeStruct {
  props: [string, TypeId][],
  additionalProps: boolean,
  min?: number,
  max?: number,
  enumeration?: string[],
}
export type ValueSource = ValueSourceRaw | ValueSourceContext | ValueSourceSecret | ValueSourceParent | ValueSourceParam;
export interface ValueSourceRaw {
  tag: 'raw',
  val: string,
}
export interface ValueSourceContext {
  tag: 'context',
  val: string,
}
export interface ValueSourceSecret {
  tag: 'secret',
  val: string,
}
export interface ValueSourceParent {
  tag: 'parent',
  val: string,
}
export interface ValueSourceParam {
  tag: 'param',
  val: string,
}
export interface ParameterTransform {
  resolverInput: TypeId,
  transformTree: string,
}
export interface TransformData {
  queryInput: TypeId,
  parameterTransform: ParameterTransform,
}
export type PolicyId = number;
export interface PolicyPerEffect {
  read?: PolicyId,
  create?: PolicyId,
  update?: PolicyId,
  'delete'?: PolicyId,
}
export type PolicySpec = PolicySpecSimple | PolicySpecPerEffect;
export interface PolicySpecSimple {
  tag: 'simple',
  val: PolicyId,
}
export interface PolicySpecPerEffect {
  tag: 'per-effect',
  val: PolicyPerEffect,
}
export type ContextCheck = ContextCheckNotNull | ContextCheckValue | ContextCheckPattern;
export interface ContextCheckNotNull {
  tag: 'not-null',
}
export interface ContextCheckValue {
  tag: 'value',
  val: string,
}
export interface ContextCheckPattern {
  tag: 'pattern',
  val: string,
}
export type RuntimeId = number;
export type MaterializerId = number;
export interface TypeFunc {
  inp: TypeId,
  parameterTransform?: ParameterTransform,
  out: TypeId,
  mat: MaterializerId,
  rateCalls: boolean,
  rateWeight?: number,
}
export interface Policy {
  name: string,
  materializer: MaterializerId,
}
export interface FuncParams {
  inp: TypeId,
  out: TypeId,
  mat: MaterializerId,
}
