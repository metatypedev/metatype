// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { rpcRequest } from "./client.ts";

export type Error = {
  stack: string[]
}

export type TypeId = number;

export type RuntimeId = number;

export type MaterializerId = number;

export type PolicyId = number;

export type Cors = {
  allowOrigin: string[]
  allowHeaders: string[]
  exposeHeaders: string[]
  allowMethods: string[]
  allowCredentials: boolean
  maxAgeSec?: number
}

export type Rate = {
  windowLimit: number
  windowSec: number
  queryLimit: number
  contextIdentifier?: string
  localExcess: number
}

export type TypegraphInitParams = {
  name: string
  dynamic?: boolean
  path: string
  prefix?: string
  cors: Cors
  rate?: Rate
}

export type Artifact = {
  path: string
  hash: string
  size: number
}

export type MigrationAction = {
  apply: boolean
  create: boolean
  reset: boolean
}

export type PrismaMigrationConfig = {
  migrationsDir: string
  migrationActions: [string, MigrationAction][]
  defaultMigrationAction: MigrationAction
}

export type SerializeParams = {
  typegraphName: string
  typegraphPath: string
  prefix?: string
  artifactResolution: boolean
  codegen: boolean
  prismaMigration: PrismaMigrationConfig
  pretty: boolean
}

export type TypeProxy = {
  name: string
  extras: [string, string][]
}

export type TypeInteger = {
  min?: number
  max?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  enumeration?: number[]
}

export type TypeFloat = {
  min?: number
  max?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  enumeration?: number[]
}

export type TypeString = {
  max?: number
  min?: number
  format?: string
  pattern?: string
  enumeration?: string[]
}

export type TypeFile = {
  min?: number
  max?: number
  allow?: string[]
}

export type TypeList = {
  of: TypeId
  min?: number
  max?: number
  uniqueItems?: boolean
}

export type TypeOptional = {
  of: TypeId
  defaultItem?: string
}

export type TypeUnion = {
  variants: TypeId[]
}

export type TypeEither = {
  variants: TypeId[]
}

export type TypeStruct = {
  props: [string, TypeId][]
  additionalProps: boolean
  min?: number
  max?: number
  enumeration?: string[]
}

export type ValueSource =
  | { raw: string }
  | { context: string }
  | { secret: string }
  | { parent: string }
  | { param: string };

export type ParameterTransform = {
  resolverInput: TypeId
  transformTree: string
}

export type TypeFunc = {
  inp: TypeId
  parameterTransform?: ParameterTransform
  out: TypeId
  mat: MaterializerId
  rateCalls: boolean
  rateWeight?: number
}

export type TransformData = {
  queryInput: TypeId
  parameterTransform: ParameterTransform
}

export type Policy = {
  name: string
  materializer: MaterializerId
}

export type PolicyPerEffect = {
  read?: PolicyId
  create?: PolicyId
  update?: PolicyId
  delete?: PolicyId
}

export type PolicySpec =
  | { simple: PolicyId }
  | { perEffect: PolicyPerEffect };

export type ContextCheck =
  | "not_null"
  | { value: string }
  | { pattern: string };

export type FuncParams = {
  inp: TypeId
  out: TypeId
  mat: MaterializerId
}

export function initTypegraph(params: TypegraphInitParams): void {
  return rpcRequest("init_typegraph", { params });
}

export function serializeTypegraph(params: SerializeParams): [string, Artifact[]] {
  return rpcRequest("serialize_typegraph", { params });
}

export function withInjection(type_id: TypeId, injection: string): TypeId {
  return rpcRequest("with_injection", { type_id, injection });
}

export function withConfig(type_id: TypeId, config: string): TypeId {
  return rpcRequest("with_config", { type_id, config });
}

export function refb(name: string, attributes?: string): TypeId {
  return rpcRequest("refb", { name, attributes });
}

export function floatb(data: TypeFloat): TypeId {
  return rpcRequest("floatb", { data });
}

export function integerb(data: TypeInteger): TypeId {
  return rpcRequest("integerb", { data });
}

export function booleanb(): TypeId {
  return rpcRequest("booleanb", null);
}

export function stringb(data: TypeString): TypeId {
  return rpcRequest("stringb", { data });
}

export function asId(id: TypeId, composite: boolean): TypeId {
  return rpcRequest("as_id", { id, composite });
}

export function fileb(data: TypeFile): TypeId {
  return rpcRequest("fileb", { data });
}

export function listb(data: TypeList): TypeId {
  return rpcRequest("listb", { data });
}

export function optionalb(data: TypeOptional): TypeId {
  return rpcRequest("optionalb", { data });
}

export function unionb(data: TypeUnion): TypeId {
  return rpcRequest("unionb", { data });
}

export function eitherb(data: TypeEither): TypeId {
  return rpcRequest("eitherb", { data });
}

export function structb(data: TypeStruct): TypeId {
  return rpcRequest("structb", { data });
}

export function extendStruct(tpe: TypeId, props: [string, TypeId][]): TypeId {
  return rpcRequest("extend_struct", { tpe, props });
}

export function getTypeRepr(id: TypeId): string {
  return rpcRequest("get_type_repr", { id });
}

export function funcb(data: TypeFunc): TypeId {
  return rpcRequest("funcb", { data });
}

export function getTransformData(resolver_input: TypeId, transform_tree: string): TransformData {
  return rpcRequest("get_transform_data", { resolver_input, transform_tree });
}

export function registerPolicy(pol: Policy): PolicyId {
  return rpcRequest("register_policy", { pol });
}

export function withPolicy(type_id: TypeId, policy_chain: PolicySpec[]): TypeId {
  return rpcRequest("with_policy", { type_id, policy_chain });
}

export function getPublicPolicy(): [PolicyId, string] {
  return rpcRequest("get_public_policy", null);
}

export function getInternalPolicy(): [PolicyId, string] {
  return rpcRequest("get_internal_policy", null);
}

export function registerContextPolicy(key: string, check: ContextCheck): [PolicyId, string] {
  return rpcRequest("register_context_policy", { key, check });
}

export function renameType(tpe: TypeId, new_name: string): TypeId {
  return rpcRequest("rename_type", { tpe, new_name });
}

export function expose(fns: [string, TypeId][], default_policy?: PolicySpec[]): void {
  return rpcRequest("expose", { fns, default_policy });
}

export function setSeed(seed?: number): void {
  return rpcRequest("set_seed", { seed });
}