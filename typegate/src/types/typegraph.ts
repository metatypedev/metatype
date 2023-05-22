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
export type EffectType = "create" | "update" | "upsert" | "delete" | "none";
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
  | "phone";
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
  none?: number | null;
  create?: number | null;
  delete?: number | null;
  update?: number | null;
  upsert?: number | null;
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
export interface TGRuntime {
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
export interface PrismaRuntimeData {
  name: string;
  datamodel: string;
  connection_string_secret: string;
  models: number[];
  migration_options?: MigrationOptions | null;
}
export interface MigrationOptions {
  migration_files?: string | null;
  create: boolean;
  reset: boolean;
}
export interface S3RuntimeData {
  host: string;
  region: string;
  access_key_secret: string;
  secret_key_secret: string;
}
