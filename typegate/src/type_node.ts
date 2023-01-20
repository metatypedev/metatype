// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export const Type = {
  OPTIONAL: "optional",
  BOOLEAN: "boolean",
  NUMBER: "number",
  INTEGER: "integer",
  STRING: "string",
  OBJECT: "object",
  ARRAY: "array",
  FUNCTION: "function",
  ANY: "any",
} as const;

type Injection =
  | { injection?: undefined; inject?: undefined }
  | { injection: "parent"; inject: number }
  | { injection: "secret"; inject: string }
  | { injection: "context"; inject: string }
  | { injection: "raw"; inject: string /* json */ };

import type {
  AnyNode,
  ArrayNode,
  BooleanNode,
  FunctionNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
} from "./types/typegraph.ts";

export type {
  AnyNode,
  ArrayNode,
  BooleanNode,
  FunctionNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
};

export type ScalarNode =
  | BooleanNode
  | IntegerNode
  | NumberNode
  | StringNode;
export type QuantifierNode = OptionalNode | ArrayNode;

//
// Runtimes

export interface DenoRuntimeData {
  worker: string;
}

export interface PrismaRuntimeData {
  name: string;
  connection_string_secret: string;
  managed_types: Array<number>;
  datamodel: string;
}

export interface TypeRuntimeBase {
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

//
// Type utils

export function isBoolean(t: TypeNode): t is BooleanNode {
  return t.type === Type.BOOLEAN;
}

export function isNumber(t: TypeNode): t is NumberNode {
  return t.type === Type.NUMBER;
}

export function isInteger(t: TypeNode): t is IntegerNode {
  return t.type === Type.INTEGER;
}

export function isString(t: TypeNode): t is StringNode {
  return t.type === Type.STRING;
}

export function isObject(t: TypeNode): t is ObjectNode {
  return t.type === Type.OBJECT;
}

export function isOptional(t: TypeNode): t is OptionalNode {
  return t.type === Type.OPTIONAL;
}

export function isArray(t: TypeNode): t is ArrayNode {
  return t.type === Type.ARRAY;
}

export function isScalar(t: TypeNode): t is ScalarNode {
  return isBoolean(t) || isInteger(t) || isNumber(t) || isString(t);
}

export function isQuantifier(t: TypeNode): t is QuantifierNode {
  return isOptional(t) || isArray(t);
}

export function isFunction(t: TypeNode): t is FunctionNode {
  return t.type === "function";
}

export function getWrappedType(t: QuantifierNode): number {
  return isOptional(t) ? t.item : t.items;
}
