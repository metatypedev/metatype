// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Float, SInt, UInt } from "./primitives.d.ts";

type Error = {
  stack: string[];
};

type TypeId = UInt;
type RuntimeId = UInt;
type MaterializerId = UInt;
type PolicyId = UInt;

type Cors = {
  allow_origin: string[];
  allow_headers: string[];
  expose_headers: string[];
  allow_methods: string[];
  allow_credentials: boolean;
  max_age_sec?: UInt;
};

type Rate = {
  window_limit: UInt;
  window_sec: UInt;
  query_limit: UInt;
  context_identifier?: string;
  local_excess: UInt;
};

type TypegraphInitParams = {
  name: string;
  dynamic?: boolean;
  path: string;
  prefix?: string;
  cors: Cors;
  rate?: Rate;
};

type Artifact = {
  path: string;
  hash: string;
  size: UInt;
};

type MigrationAction = {
  apply: boolean;
  create: boolean;
  reset: boolean;
};

type PrismaMigrationConfig = {
  migrations_dir: string;
  migration_actions: [string, MigrationAction][];
  default_migration_action: MigrationAction;
};

type SerializeParams = {
  typegraph_path: string;
  prefix?: string;
  artifact_resolution: boolean;
  codegen: boolean;
  prisma_migration: PrismaMigrationConfig;
  pretty: boolean;
};

type TypeProxy = {
  name: string;
  extras: [string, string][];
};

type TypeInteger = {
  min?: SInt;
  max?: SInt;
  exclusive_minimum?: SInt;
  exclusive_maximum?: SInt;
  multiple_of?: SInt;
  enumeration?: SInt[];
};

type TypeFloat = {
  min?: Float;
  max?: Float;
  exclusive_minimum?: Float;
  exclusive_maximum?: Float;
  multiple_of?: Float;
  enumeration?: Float[];
};

type TypeString = {
  max?: UInt;
  min?: UInt;
  format?: string;
  pattern?: string;
  enumeration?: string[];
};

type TypeFile = {
  min?: UInt;
  max?: UInt;
  allow?: string[];
};

type TypeList = {
  of: TypeId;
  min?: UInt;
  max?: UInt;
  unique_items?: boolean;
};

type TypeOptional = {
  of: TypeId;
  default_item?: string;
};

type TypeUnion = {
  variants: TypeId[];
};

type TypeEither = {
  variants: TypeId[];
};

type TypeStruct = {
  props: [string, TypeId][];
  additional_props: boolean;
  min?: UInt;
  max?: UInt;
  enumeration?: string[];
};

type ValueSource =
  | { raw: string } // json
  | { context: string } // key
  | { secret: string } // key
  | { parent: string } // name
  | { param: string }; // name

type ParameterTransform = {
  resolver_input: TypeId;
  transform_tree: string;
};

type TypeFunc = {
  inp: TypeId;
  parameter_transform?: ParameterTransform;
  out: TypeId;
  mat: MaterializerId;
  rate_calls: boolean;
  rate_weight?: UInt;
};

type TransformData = {
  query_input: TypeId;
  parameter_transform: ParameterTransform;
};

type Policy = {
  name: string;
  materializer: MaterializerId;
};

type PolicyPerEffect = {
  read?: PolicyId;
  create?: PolicyId;
  update?: PolicyId;
  delete?: PolicyId;
};

type PolicySpec = { simple: PolicyId } | { per_effect: PolicyPerEffect };

type ContextCheck = "not_null" | { value: string } | { pattern: string };

type FuncParams = {
  inp: TypeId;
  out: TypeId;
  mat: MaterializerId;
};

type init_typegraph = (params: TypegraphInitParams) => void;

type serialize_typegraph = (params: SerializeParams) => [string, Artifact[]];

type with_injection = (type_id: TypeId, injection: string) => TypeId;

type with_config = (type_id: TypeId, config: string) => TypeId;

type refb = (name: string, attributes?: string) => TypeId;

type floatb = (data: TypeFloat) => TypeId;

type integerb = (data: TypeInteger) => TypeId;

type booleanb = () => TypeId;

type stringb = (data: TypeString) => TypeId;

type as_id = (id: TypeId, composite: boolean) => TypeId;

type fileb = (data: TypeFile) => TypeId;

type listb = (data: TypeList) => TypeId;

type optionalb = (data: TypeOptional) => TypeId;

type unionb = (data: TypeUnion) => TypeId;

type eitherb = (data: TypeEither) => TypeId;

type structb = (data: TypeStruct) => TypeId;

type extend_struct = (tpe: TypeId, props: [string, TypeId][]) => TypeId;

type get_type_repr = (id: TypeId) => string;

type funcb = (data: TypeFunc) => TypeId;

type get_transform_data = (
  resolver_input: TypeId,
  transform_tree: string,
) => TransformData;

type register_policy = (pol: Policy) => PolicyId;

type with_policy = (type_id: TypeId, policy_chain: PolicySpec[]) => TypeId;

type get_public_policy = () => [PolicyId, string];

type get_internal_policy = () => [PolicyId, string];

type register_context_policy = (
  key: string,
  check: ContextCheck,
) => [PolicyId, string];

type rename_type = (tpe: TypeId, new_name: string) => TypeId;

type expose = (fns: [string, TypeId][], default_policy?: PolicySpec[]) => void;

type set_seed = (seed?: UInt) => void;

export type {
  Error,
  TypeId,
  RuntimeId,
  MaterializerId,
  PolicyId,
  Cors,
  Rate,
  TypegraphInitParams,
  Artifact,
  MigrationAction,
  PrismaMigrationConfig,
  SerializeParams,
  TypeProxy,
  TypeInteger,
  TypeFloat,
  TypeString,
  TypeFile,
  TypeList,
  TypeOptional,
  TypeUnion,
  TypeEither,
  TypeStruct,
  ValueSource,
  ParameterTransform,
  TypeFunc,
  TransformData,
  Policy,
  PolicyPerEffect,
  PolicySpec,
  ContextCheck,
  FuncParams,
  init_typegraph,
  serialize_typegraph,
  with_injection,
  with_config,
  refb,
  floatb,
  integerb,
  booleanb,
  stringb,
  as_id,
  fileb,
  listb,
  optionalb,
  unionb,
  eitherb,
  structb,
  extend_struct,
  get_type_repr,
  funcb,
  get_transform_data,
  register_policy,
  with_policy,
  get_public_policy,
  get_internal_policy,
  register_context_policy,
  rename_type,
  expose,
  set_seed,
};
