// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

// deno-lint-ignore-file no-explicit-any

export type OptionalNode = {
  config?: {
    [k: string]: unknown;
  };
  default_value?: any;
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  item: number;
  policies: number[];
  runtime: number;
  title: string;
  type: "optional";
};
export type BooleanNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "boolean";
};
export type NumberNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  exclusiveMaximum?: number | null;
  exclusiveMinimum?: number | null;
  inject?: unknown;
  injection?: string | null;
  maximum?: number | null;
  minimum?: number | null;
  multipleOf?: number | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "number";
};
export type IntegerNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  exclusiveMaximum?: number | null;
  exclusiveMinimum?: number | null;
  inject?: unknown;
  injection?: string | null;
  maximum?: number | null;
  minimum?: number | null;
  multipleOf?: number | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "integer";
};
export type StringNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  format?: string | null;
  inject?: unknown;
  injection?: string | null;
  maxLength?: number | null;
  minLength?: number | null;
  pattern?: string | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "string";
};
export type ObjectNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  policies: number[];
  properties: {
    [k: string]: number;
  };
  required?: string[];
  runtime: number;
  title: string;
  type: "object";
};
export type ArrayNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  items: number;
  maxItems?: number | null;
  minItems?: number | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "array";
  uniqueItems?: boolean | null;
};
export type FunctionNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  input: number;
  materializer: number;
  output: number;
  policies: number[];
  rate_calls: boolean;
  rate_weight?: number | null;
  runtime: number;
  title: string;
  type: "function";
};
export type AnyNode = {
  config?: {
    [k: string]: unknown;
  };
  description?: string | null;
  enum?: any[] | null;
  inject?: unknown;
  injection?: string | null;
  policies: number[];
  runtime: number;
  title: string;
  type: "any";
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
  | AnyNode;
export interface Typegraph {
  materializers?: Materializer[];
  meta: TypeMeta;
  policies?: Policy[];
  runtimes: TGRuntime[];
  types: TypeNode[];
}
export interface Materializer {
  data: {
    [k: string]: unknown;
  };
  name: string;
  runtime: number;
}
export interface TypeMeta {
  auths: Auth[];
  cors: Cors;
  rate?: Rate | null;
  secrets: string[];
  version: string;
}
export interface Auth {
  auth_data: {
    [k: string]: unknown;
  };
  name: string;
  protocol: string;
}
export interface Cors {
  allow_credentials: boolean;
  allow_headers: string[];
  allow_origin: string[];
  expose_headers: string[];
  max_age?: number | null;
}
export interface Rate {
  context_identifier?: string | null;
  local_excess: number;
  query_limit: number;
  window_limit: number;
  window_sec: number;
}
export interface Policy {
  materializer: number;
  name: string;
}
export interface TGRuntime {
  data: {
    [k: string]: unknown;
  };
  name: string;
}
