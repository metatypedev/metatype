// Copyright Metatype under the Elastic License 2.0.

type Injection =
  | { injection?: undefined; inject?: undefined }
  | { injection: "parent"; inject: number }
  | { injection: "secret"; inject: string }
  | { injection: "context"; inject: string }
  | { injection: "raw"; inject: string /* json */ };

type TypeNodeBase =
  & {
    // type: string;
    title: string;
    description?: string;
    runtime: number;
    policies: Array<number>;
    config?: Record<string, any>;
  }
  & Injection;

export type TypeOptional = TypeNodeBase & {
  type: "optional";
  item: number;
  default_value: any;
};

export type BooleanNode = TypeNodeBase & { type: "boolean" };

export type NumberNode = TypeNodeBase & {
  type: "number";
  minimum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
};

export type IntegerNode = { type: "integer" } & Omit<NumberNode, "type">;

export type StringNode = TypeNodeBase & {
  type: "string";
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
};

export type ObjectNode = TypeNodeBase & {
  type: "object";
  properties: Record<string, number>;
  required?: string[];
};

export type ArrayNode = TypeNodeBase & {
  type: "array";
  items: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};

export type FunctionNode = TypeNodeBase & {
  type: "function";
  input: number;
  output: number;
  materializer: number;
  rate_weight: number | null;
  rate_calls: boolean;
};

// datetime, date, ean, path, ip, phone, set, json, tuple, union

export type TypeNode =
  | TypeOptional
  | BooleanNode
  | NumberNode
  | IntegerNode
  | StringNode
  | ObjectNode
  | ArrayNode
  | FunctionNode;

//
// Runtimes

export interface DenoRuntimeData {
  worker: string;
}

export interface PrismaRuntimeData {
  name: string;
  connection_string: string;
  managed_types: Array<number>;
  datasource: string;
  datamodel: string;
}

interface TypeRuntimeBase {
  name: string;
  data: unknown;
}

export interface DenoRuntimeDS extends TypeRuntimeBase {
  name: "deno";
  data: DenoRuntimeData;
}

export interface PrismaRuntimeDS extends TypeRuntimeBase {
  name: "prisma";
  data: PrismaRuntimeData;
}

export type TypeRuntime = DenoRuntimeDS | PrismaRuntimeDS;
