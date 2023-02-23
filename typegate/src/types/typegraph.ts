// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

// deno-lint-ignore-file no-explicit-any

export type OptionalNode = {
  type: "optional";
  item: number;
  default_value?: any;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type BooleanNode = {
  type: "boolean";
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type NumberNode = {
  type: "number";
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type IntegerNode = {
  type: "integer";
  minimum?: number | null;
  maximum?: number | null;
  exclusiveMinimum?: number | null;
  exclusiveMaximum?: number | null;
  multipleOf?: number | null;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type StringNode = {
  type: "string";
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  format?: string | null;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type ObjectNode = {
  type: "object";
  properties: {
    [k: string]: number;
  };
  required?: string[];
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type ArrayNode = {
  type: "array";
  items: number;
  maxItems?: number | null;
  minItems?: number | null;
  uniqueItems?: boolean | null;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type FunctionNode = {
  type: "function";
  input: number;
  output: number;
  materializer: number;
  rate_weight?: number | null;
  rate_calls: boolean;
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type UnionNode = {
  type: "union";
  anyOf: number[];
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type EitherNode = {
  type: "either";
  oneOf: number[];
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
  config?: {
    [k: string]: unknown;
  };
};
export type AnyNode = {
  type: "any";
  title: string;
  runtime: number;
  policies: number[];
  description?: string | null;
  injection?: string | null;
  inject?: any;
  enum?: any[] | null;
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
  | ObjectNode
  | ArrayNode
  | FunctionNode
  | UnionNode
  | EitherNode
  | AnyNode;
export type EffectType = "create" | "update" | "upsert" | "delete";
export type AuthProtocol = "oauth2" | "jwk" | "basic";
export interface Typegraph {
  $id: string;
  types: TypeNode[];
  materializers: Materializer[];
  runtimes: TGRuntime[];
  policies: Policy[];
  meta: TypeMeta;
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
  effect_materializers: EffectMaterializers;
}
export interface EffectMaterializers {
  create?: number | null;
  update?: number | null;
  upsert?: number | null;
  delete?: number | null;
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
  max_age?: number | null;
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
