// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// deno-lint-ignore-file no-explicit-any

export type OptionalNode = {
  type: "optional";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  item: number;
  default_value?: any;
};
export type BooleanNode = {
  type: "boolean";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
};
export type NumberNode = {
  type: "number";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
};
export type IntegerNode = {
  type: "integer";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
};
export type StringNode = {
  type: "string";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  format?: StringFormat | null;
};
export type FileNode = {
  type: "file";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  minSize?: number | null;
  maxSize?: number | null;
  mimeTypes?: string[] | null;
};
export type ObjectNode = {
  type: "object";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  properties: {
    [k: string]: number;
  };
  required?: string[];
};
export type ArrayNode = {
  type: "array";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  items: number;
  maxItems?: number | null;
  minItems?: number | null;
  uniqueItems?: boolean | null;
};
export type FunctionNode = {
  type: "function";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  input: number;
  output: number;
  materializer: number;
  rate_weight?: number | null;
  rate_calls: boolean;
};
export type UnionNode = {
  type: "union";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  anyOf: number[];
};
export type EitherNode = {
  type: "either";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
  oneOf: number[];
};
export type AnyNode = {
  type: "any";
  title: string;
  runtime: number;
  policies: PolicyIndices[];
  description?: string | null;
  injection?: InjectionSwitch | null;
  enum?: string[] | null;
  config?: {
    [k: string]: unknown;
  };
  as_id: boolean;
};
export type TypeNode =
  | OptionalNode
  | BooleanNode
  | NumberNode
  | IntegerNode
  | StringNode
  | FileNode
  | ObjectNode
  | ArrayNode
  | FunctionNode
  | UnionNode
  | EitherNode
  | AnyNode;
export type PolicyIndices = number | PolicyIndicesByEffect;
export type EffectType = "create" | "update" | "delete" | "none";
export type InjectionSource = {
  source: "static";
  data: string;
} | {
  source: "context";
  data: string;
} | {
  source: "secret";
  data: string;
} | {
  source: "parent";
  data: number;
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
  name: "random";
  data: RandomRuntimeData;
} | {
  name: "prisma";
  data: PrismaRuntimeData;
} | {
  name: "s3";
  data: S3RuntimeData;
} | {
  name: "temporal";
  data: TemporalRuntimeData;
};
export type Cardinality = "optional" | "one" | "many";
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
  prefix?: string | null;
}
export interface PolicyIndicesByEffect {
  none?: number | null;
  create?: number | null;
  delete?: number | null;
  update?: number | null;
}
export interface InjectionSwitch {
  cases: InjectionCase[];
  default?: InjectionSource | null;
}
export interface InjectionCase {
  effect: EffectType;
  injection: InjectionSource;
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
export interface RandomRuntimeData {
  seed: number;
  reset?: string | null;
}
export interface PrismaRuntimeData {
  name: string;
  connection_string_secret: string;
  models: number[];
  relationships: Relationship[];
  migration_options?: MigrationOptions | null;
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
export interface S3RuntimeData {
  host_secret: string;
  region_secret: string;
  access_key_secret: string;
  secret_key_secret: string;
  path_style_secret: string;
}
export interface TemporalRuntimeData {
  name: string;
  host: string;
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
  secrets: string[];
  cors: Cors;
  auths: Auth[];
  rate?: Rate | null;
  version: string;
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
export interface FunctionMatData {
  script: string;
}
export interface ModuleMatData {
  code: string;
}
