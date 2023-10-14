// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraphDS } from "../typegraph/mod.ts";
import { Type, TypeNode } from "./type_node.ts";

interface Path {
  indices: number[];
  edges: string[];
}

interface VisitorNode<T extends TypeNode> {
  type: T;
  idx: number;
  path: Path;
}

function extendPath(path: Path, [idx, edge]: [number, string]): Path {
  return {
    indices: [...path.indices, idx],
    edges: [...path.edges, edge],
  };
}

export interface TypeVisitorFn<T extends TypeNode = TypeNode> {
  // return false to skip visiting the children
  (node: VisitorNode<T>): boolean;
}

export type TypeVisitorMap = {
  [Key in TypeNode["type"] | "default"]?: TypeVisitorFn<
    Key extends "default" ? TypeNode : Extract<TypeNode, { type: Key }>
  >;
};

// type TypeVisitorMap = Partial<
//   Record<TypeNode["type"] | "default", TypeVisitorFn>
// >;

export type TypeVisitor = TypeVisitorFn | TypeVisitorMap;

export function getChildTypes(type: TypeNode): number[] {
  switch (type.type) {
    case Type.OPTIONAL:
      return [type.item];
    case Type.ARRAY:
      return [type.items];
    case Type.OBJECT:
      return Object.values(type.properties);
    case Type.FUNCTION:
      return [type.input, type.output];
    case Type.UNION:
      return type.anyOf;
    case Type.EITHER:
      return type.oneOf;

    default:
      return [];
  }
}

export const Edge = {
  OPTIONAL_ITEM: "[item]",
  ARRAY_ITEMS: "[items]",
  FUNCTION_INPUT: "[in]",
  FUNCTION_OUTPUT: "[out]",
  // OBJECT_PROPERTY: <property name>
};

export function getEdges(type: TypeNode): Record<string, number> {
  switch (type.type) {
    case Type.OPTIONAL:
      return { [Edge.OPTIONAL_ITEM]: type.item };
    case Type.ARRAY:
      return { [Edge.ARRAY_ITEMS]: type.items };
    case Type.UNION:
    case Type.EITHER: {
      const variants = type.type == Type.UNION ? type.anyOf : type.oneOf;
      const rec = {} as Record<string, number>;
      for (let i = 0; i < variants.length; i++) {
        rec[`[v${i}]`] = variants[i];
      }
      return rec;
    }
    case Type.OBJECT:
      return { ...type.properties };
    case Type.FUNCTION:
      return {
        [Edge.FUNCTION_INPUT]: type.input,
        [Edge.FUNCTION_OUTPUT]: type.output,
      };
    default:
      return {};
  }
}

const noopVisitor: TypeVisitorFn = () => true;

interface VisitOptions {
  allowCircular?: boolean;
}

export function visitType(
  tg: TypeGraphDS,
  typeIdx: number,
  visitor: TypeVisitor,
  opts: VisitOptions = {},
) {
  const { allowCircular = false } = opts;

  const visited = new Set<number>();
  const types = tg.types;

  const pickVisitor = (typeName: TypeNode["type"], visitor: TypeVisitorMap) =>
    (visitor[typeName] ?? visitor["default"] ?? noopVisitor) as TypeVisitorFn;

  const visitorFn: TypeVisitorFn = typeof visitor === "function"
    ? visitor
    : (node) => pickVisitor(node.type.type, visitor)(node);

  function visit(node: VisitorNode<TypeNode>) {
    const { idx } = node;
    if (!allowCircular) {
      if (visited.has(idx)) return;
      visited.add(idx);
    }
    if (visitorFn(node)) {
      for (const [edgeName, childIdx] of Object.entries(getEdges(node.type))) {
        const child = tg.types[childIdx];
        visit({
          type: child,
          idx: childIdx,
          path: extendPath(node.path, [childIdx, edgeName]),
        });
      }
    }
  }

  visit({
    type: types[typeIdx],
    idx: typeIdx,
    path: { indices: [typeIdx], edges: [] },
  });
}

export function visitTypes(
  tg: TypeGraphDS,
  types: number[],
  visitor: TypeVisitor,
) {
  for (const typeIdx of types) {
    visitType(tg, typeIdx, visitor);
  }
}
