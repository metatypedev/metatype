// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// deno-lint-ignore-file no-explicit-any no-empty-interface

export type OptionalNode = {
  type: "optional";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  item: number;
  default_value?: any;
};
export type BooleanNode = {
  type: "boolean";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
};
export type FloatNode = {
  type: "float";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
};
export type IntegerNode = {
  type: "integer";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
};
export type StringNode = {
  type: "string";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  format?: StringFormat | null;
};
export type FileNode = {
  type: "file";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  minSize?: number | null;
  maxSize?: number | null;
  mimeTypes?: string[] | null;
};
export type ObjectNode = {
  type: "object";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  properties: {
    [k: string]: number;
  };
  required?: string[];
  id: string[];
};
export type ListNode = {
  type: "list";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  items: number;
  maxItems?: number | null;
  minItems?: number | null;
  uniqueItems?: boolean | null;
};
export type InjectionNode =
  | { children: Record<string, InjectionNode> }
  | { injection: Injection };
export type FunctionNode = {
  type: "function";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  input: number;
  injections: Record<string, InjectionNode>;
  parameterTransform?: FunctionParameterTransform | null;
  output: number;
  runtimeConfig: unknown;
  materializer: number;
  rate_weight?: number | null;
  rate_calls: boolean;
};
export type UnionNode = {
  type: "union";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  anyOf: number[];
};
export type EitherNode = {
  type: "either";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
  oneOf: number[];
};
export type AnyNode = {
  type: "any";
  title: string;
  policies: PolicyIndices[];
  description?: string | null;
  enum?: string[] | null;
};
export type TypeNode =
  | OptionalNode
  | BooleanNode
  | FloatNode
  | IntegerNode
  | StringNode
  | FileNode
  | ObjectNode
  | ListNode
  | FunctionNode
  | UnionNode
  | EitherNode
  | AnyNode;
export type PolicyIndices = number | PolicyIndicesByEffect;
export type Injection = {
  source: "static";
  data: InjectionData;
} | {
  source: "context";
  data: InjectionData;
} | {
  source: "secret";
  data: InjectionData;
} | {
  source: "parent";
  data: InjectionData;
} | {
  source: "dynamic";
  data: InjectionData;
} | {
  source: "random";
  data: InjectionData;
};
export type InjectionData = SingleInjectionValue | {
  [k: string]: unknown;
};
export type StringFormat =
  | "uuid"
  | "email"
  | "uri"
  | "json"
  | "hostname"
  | "ean"
  | "date"
  | "date-time"
  | "phone";
export type ParameterTransformNodeData =
  | ParameterTransformLeafNode
  | ParameterTransformParentNode;
export type ParameterTransformLeafNode = {
  source: "arg";
  name: string;
} | {
  source: "static";
  valueJson: string;
} | {
  source: "secret";
  key: string;
} | {
  source: "context";
  key: string;
} | {
  source: "parent";
  parentIdx: number;
};
export type ParameterTransformParentNode = {
  type: "object";
  fields: {
    [k: string]: ParameterTransformNode;
  };
} | {
  type: "array";
  items: ParameterTransformNode[];
};
export type EffectType = "create" | "update" | "delete" | "read";
export type TGRuntime = KnownRuntime | UnknownRuntime;
export type KnownRuntime = {
  name: "deno";
  data: DenoRuntimeData;
} | {
  name: "graphql";
  data: GraphQLRuntimeData;
} | {
  name: "http";
  data: HTTPRuntimeData;
} | {
  name: "python";
  data: PythonRuntimeData;
} | {
  name: "random";
  data: RandomRuntimeData;
} | {
  name: "prisma";
  data: PrismaRuntimeData;
} | {
  name: "prisma_migration";
  data: PrismaMigrationRuntimeData;
} | {
  name: "s3";
  data: S3RuntimeData;
} | {
  name: "temporal";
  data: TemporalRuntimeData;
} | {
  name: "wasm_wire";
  data: WasmRuntimeData;
} | {
  name: "wasm_reflected";
  data: WasmRuntimeData;
} | {
  name: "typegate";
  data: TypegateRuntimeData;
} | {
  name: "typegraph";
  data: TypegraphRuntimeData;
};
export type Property = {
  type: "scalar";
  key: string;
  propType: ScalarType;
  cardinality: Cardinality;
  typeIdx: number;
  injection?: ManagedInjection | null;
  unique: boolean;
  auto: boolean;
  defaultValue?: any;
} | {
  type: "relationship";
  key: string;
  cardinality: Cardinality;
  typeIdx: number;
  modelName: string;
  unique: boolean;
  relationshipName: string;
  relationshipSide: Side;
};
export type ScalarType = {
  type: "Boolean";
} | {
  type: "Int";
} | {
  type: "Float";
} | {
  type: "String";
  format: StringType;
};
export type StringType = "Plain" | "Uuid" | "DateTime";
export type Cardinality = "optional" | "one" | "many";
export type Injection2 = "DateNow";
export type Side = "left" | "right";
export type AuthProtocol = "oauth2" | "jwt" | "basic";
export type S3Materializer = {
  name: "presign_get";
  data: {
    bucket: string;
    expiry_secs?: number | null;
  };
} | {
  name: "presign_put";
  data: {
    bucket: string;
    content_type?: string | null;
    expiry_secs?: number | null;
  };
} | {
  name: "list";
  data: {
    bucket: string;
  };
} | {
  name: "upload";
  data: {
    bucket: string;
  };
} | {
  name: "upload_all";
  data: {
    bucket: string;
  };
};
export interface Typegraph {
  $id: string;
  types: TypeNode[];
  materializers: Materializer[];
  runtimes: TGRuntime[];
  policies: Policy[];
  meta: TypeMeta;
}
export interface PolicyIndicesByEffect {
  read?: number | null;
  create?: number | null;
  delete?: number | null;
  update?: number | null;
}
export interface SingleInjectionValue {
  value: unknown;
}
export interface FunctionParameterTransform {
  resolver_input: number;
  transform_root: ParameterTransformNode;
}
export interface ParameterTransformNode {
  typeIdx: number;
  data: ParameterTransformNodeData;
}
export interface Materializer {
  name: string;
  runtime: number;
  effect: Effect;
  data: {
    [k: string]: unknown;
  };
}
export interface Effect {
  effect?: EffectType | null;
  idempotent: boolean;
}
export interface DenoRuntimeData {
  worker: string;
  permissions: {
    [k: string]: unknown;
  };
}
export interface GraphQLRuntimeData {
  endpoint: string;
}
export interface HTTPRuntimeData {
  endpoint: string;
  cert_secret?: string | null;
  basic_auth_secret?: string | null;
}
export interface PythonRuntimeData {
  config?: string | null;
}
export interface RandomRuntimeData {
  seed?: number | null;
  reset?: string | null;
}
export interface PrismaRuntimeData {
  name: string;
  connection_string_secret: string;
  models: Model[];
  relationships: Relationship[];
  migration_options?: MigrationOptions | null;
}
export interface Model {
  typeIdx: number;
  typeName: string;
  props: Property[];
  idFields: string[];
  uniqueConstraints: string[][];
}
export interface ManagedInjection {
  create?: Injection2 | null;
  update?: Injection2 | null;
}
export interface Relationship {
  name: string;
  left: RelationshipModel;
  right: RelationshipModel;
}
export interface RelationshipModel {
  type_idx: number;
  field: string;
  cardinality: Cardinality;
}
export interface MigrationOptions {
  migration_files?: string | null;
  create: boolean;
  reset: boolean;
}
export interface PrismaMigrationRuntimeData {
}
export interface S3RuntimeData {
  host_secret: string;
  region_secret: string;
  access_key_secret: string;
  secret_key_secret: string;
  path_style_secret: string;
}
export interface TemporalRuntimeData {
  name: string;
  host_secret: string;
  namespace_secret?: string;
}
export interface WasmRuntimeData {
  wasm_artifact: string;
}
export interface TypegateRuntimeData {
}
export interface TypegraphRuntimeData {
}
export interface UnknownRuntime {
  name: string;
  data: {
    [k: string]: unknown;
  };
}
export interface Policy {
  name: string;
  materializer: number;
}
export interface TypeMeta {
  prefix?: string | null;
  secrets: string[];
  queries: Queries;
  cors: Cors;
  auths: Auth[];
  rate?: Rate | null;
  version: string;
  randomSeed?: number | null;
  artifacts: {
    [k: string]: Artifact;
  };
  namespaces?: number[] | null;
}
export interface Queries {
  dynamic: boolean;
  endpoints: string[];
}
export interface Cors {
  allow_origin: string[];
  allow_headers: string[];
  expose_headers: string[];
  allow_methods?: string[];
  allow_credentials: boolean;
  max_age_sec?: number | null;
}
export interface Auth {
  name: string;
  protocol: AuthProtocol;
  auth_data: {
    [k: string]: unknown;
  };
}
export interface Rate {
  window_limit: number;
  window_sec: number;
  query_limit: number;
  context_identifier?: string | null;
  local_excess: number;
}
export interface Artifact {
  path: string;
  hash: string;
  size: number;
}
export interface FunctionMatData {
  script: string;
}
export interface ModuleMatData {
  code: string;
}
export interface PrismaOperationMatData {
  table: string;
  operation: string;
  ordered_keys?: string[] | null;
}
export interface WasiMatData {
  func: string;
  wasmArtifact: string;
}

export interface KvRuntimeData {
  url: string;
}
