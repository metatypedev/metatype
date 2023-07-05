// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export const Type = {
  OPTIONAL: "optional",
  BOOLEAN: "boolean",
  NUMBER: "number",
  INTEGER: "integer",
  STRING: "string",
  FILE: "file",
  OBJECT: "object",
  ARRAY: "array",
  FUNCTION: "function",
  UNION: "union",
  EITHER: "either",
  ANY: "any",
} as const;

import type {
  AnyNode,
  ArrayNode,
  BooleanNode,
  EitherNode,
  FileNode,
  FunctionNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
  UnionNode,
} from "./types/typegraph.ts";

export type {
  AnyNode,
  ArrayNode,
  BooleanNode,
  FileNode,
  FunctionNode,
  IntegerNode,
  NumberNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
  UnionNode,
};

export type ScalarNode =
  | BooleanNode
  | IntegerNode
  | NumberNode
  | StringNode
  | FileNode;
export type QuantifierNode = OptionalNode | ArrayNode;

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

export function isFile(t: TypeNode): t is FileNode {
  return t.type === Type.FILE;
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
  return isBoolean(t) || isInteger(t) || isNumber(t) || isString(t) ||
    isFile(t);
}

export function isQuantifier(t: TypeNode): t is QuantifierNode {
  return isOptional(t) || isArray(t);
}

export function isFunction(t: TypeNode): t is FunctionNode {
  return t.type === "function";
}

export function isUnion(t: TypeNode): t is UnionNode {
  return t.type === "union";
}

export function isEither(t: TypeNode): t is EitherNode {
  return t.type === "either";
}

export function getWrappedType(t: QuantifierNode): number {
  return isOptional(t) ? t.item : t.items;
}

/**
 * Returns the indexes of the variant types for a node of type `union`
 * or `either`.
 */
export function getVariantTypesIndexes(
  typeNode: UnionNode | EitherNode,
): number[] {
  if (typeNode.type === "union") {
    return typeNode.anyOf;
  } else {
    return typeNode.oneOf;
  }
}
