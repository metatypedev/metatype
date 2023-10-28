// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export const Type = {
  OPTIONAL: "optional",
  BOOLEAN: "boolean",
  FLOAT: "float",
  INTEGER: "integer",
  STRING: "string",
  FILE: "file",
  OBJECT: "object",
  LIST: "list",
  FUNCTION: "function",
  UNION: "union",
  EITHER: "either",
  ANY: "any",
} as const;

import type {
  AnyNode,
  BooleanNode,
  EitherNode,
  FileNode,
  FloatNode,
  FunctionNode,
  IntegerNode,
  ListNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
  UnionNode,
} from "./types.ts";

export type {
  AnyNode,
  BooleanNode,
  FileNode,
  FloatNode,
  FunctionNode,
  IntegerNode,
  ListNode,
  ObjectNode,
  OptionalNode,
  StringNode,
  TypeNode,
  UnionNode,
};

export type ScalarNode =
  | BooleanNode
  | IntegerNode
  | FloatNode
  | StringNode
  | FileNode;
export type QuantifierNode = OptionalNode | ListNode;

//
// Type utils

export function isBoolean(t: TypeNode): t is BooleanNode {
  return t.type === Type.BOOLEAN;
}

export function isNumber(t: TypeNode): t is FloatNode {
  return t.type === Type.FLOAT;
}

export function isInteger(t: TypeNode): t is IntegerNode {
  return t.type === Type.INTEGER;
}

export function isString(t: TypeNode): t is StringNode {
  return t.type === Type.STRING;
}

export function isUuid(t: TypeNode): t is StringNode {
  return isString(t) && t.format === "uuid";
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

export function isList(t: TypeNode): t is ListNode {
  return t.type === Type.LIST;
}

export function isScalar(t: TypeNode): t is ScalarNode {
  return isBoolean(t) || isInteger(t) || isNumber(t) || isString(t) ||
    isFile(t);
}

export function isQuantifier(t: TypeNode): t is QuantifierNode {
  return isOptional(t) || isList(t);
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
