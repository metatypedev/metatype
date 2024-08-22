// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph, TypeGraphDS } from "../typegraph/mod.ts";
import {
  EitherNode,
  isObject,
  Type,
  TypeNode,
  UnionNode,
} from "./type_node.ts";
import { TypeIdx } from "../types.ts";

export function isInjected(tg: TypeGraphDS, t: TypeNode): boolean {
  return (
    t.injection != null ||
    (isObject(t) &&
      t.properties.length > 0 &&
      Object.values(t.properties)
        .map((propIdx) => tg.types[propIdx])
        .every((nested) => isInjected(tg, nested)))
  );
}

const NON_SCALAR_TYPES: Array<TypeNode["type"]> = [
  Type.OBJECT,
  Type.LIST,
  Type.UNION,
  Type.EITHER,
  Type.FUNCTION,
];

export class TypeUtils {
  constructor(private tg: TypeGraph) {}

  flattenUnionVariants(variants: TypeIdx[]): TypeIdx[] {
    return variants.flatMap((idx) => {
      const typeNode = this.tg.type(idx);
      switch (typeNode.type) {
        case Type.UNION:
          return this.flattenUnionVariants(typeNode.anyOf);
        case Type.EITHER:
          return this.flattenUnionVariants(typeNode.oneOf);
        default:
          return [idx];
      }
    });
  }

  getFlatUnionVariants(typeNode: UnionNode | EitherNode): TypeIdx[] {
    switch (typeNode.type) {
      case Type.UNION:
        return this.flattenUnionVariants(typeNode.anyOf);
      case Type.EITHER:
        return this.flattenUnionVariants(typeNode.oneOf);
      default:
        throw new Error("unreachable");
    }
  }

  // /**
  //  * Get the variants of the union or either that does require a selection set
  //  * at multiple levels (for union of unions...), in a record by name.
  //  */
  // getTypeSelectionsForVariants(
  //   typeNode: UnionNode | EitherNode,
  // ): Record<string, TypeIdx> {
  //   const variants = this.getFlatUnionVariants(typeNode);
  //   return Object.fromEntries(
  //     variants.flatMap((idx) => {
  //       if (this.isScalarOrListOfScalars(this.type(idx))) {
  //         return [];
  //       } else {
  //         return [[this.type(idx).title, idx]];
  //       }
  //     }),
  //   );
  // }

  isScalarOrListOfScalars(typeNode: TypeNode): boolean {
    let unwrapped = typeNode;
    while (true) {
      if (unwrapped.type === Type.OPTIONAL) {
        unwrapped = this.tg.type(unwrapped.item);
      } else if (unwrapped.type === Type.LIST) {
        unwrapped = this.tg.type(unwrapped.items);
      } else {
        return !NON_SCALAR_TYPES.includes(unwrapped.type);
      }
    }
  }

  traverseVirtualPath(
    root: TypeNode,
    getNext: (node: TypeNode) => TypeIdx | null,
  ): TypeNode {
    let current = root;
    while (true) {
      const next = getNext(current);
      if (next == null) {
        return current;
      }
      current = this.tg.type(next);
    }
  }

  unwrapQuantifier(typeNode: TypeNode): TypeNode {
    return this.traverseVirtualPath(typeNode, (node) => {
      switch (node.type) {
        case Type.OPTIONAL:
          return node.item;
        case Type.LIST:
          return node.items;
        default:
          return null;
      }
    });
  }
}
