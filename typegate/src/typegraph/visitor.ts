// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS } from "../typegraph.ts";
import { Type, TypeNode } from "../type_node.ts";

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

    default:
      return [];
  }
}

export function getEdges(type: TypeNode): Record<string, number> {
  switch (type.type) {
    case Type.OPTIONAL:
      return { "[item]": type.item };
    case Type.ARRAY:
      return { "[items]": type.items };
    case Type.OBJECT:
      return { ...type.properties };
    case Type.FUNCTION:
      return { "[in]": type.input, "[out]": type.output };
    default:
      return {};
  }
}

const noopVisitor: TypeVisitorFn = () => true;

export function visitType(
  tg: TypeGraphDS,
  typeIdx: number,
  visitor: TypeVisitor,
) {
  const visited = new Set<number>();
  const types = tg.types;

  const pickVisitor = (typeName: TypeNode["type"], visitor: TypeVisitorMap) =>
    (visitor[typeName] ?? visitor["default"] ?? noopVisitor) as TypeVisitorFn;

  const visitorFn: TypeVisitorFn = typeof visitor === "function"
    ? visitor
    : (node) => pickVisitor(node.type.type, visitor)(node);

  function visit(node: VisitorNode<TypeNode>) {
    const { idx } = node;
    if (visited.has(idx)) return;
    visited.add(idx);
    if (visitorFn(node)) {
      // console.log({ node });
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
