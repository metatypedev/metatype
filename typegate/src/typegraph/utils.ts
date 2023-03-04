// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS } from "../typegraph.ts";
import { visitType } from "./visitor.ts";
import { cyan, green } from "std/fmt/colors.ts";
import { isObject, TypeNode } from "../type_node.ts";

export function treeView(tg: TypeGraphDS, rootIdx = 0, depth = 4) {
  visitType(tg, rootIdx, ({ type, idx, path }) => {
    const indent = "    ".repeat(path.edges.length);
    const edge = cyan(`${path.edges[path.edges.length - 1] ?? "[root]"}`);
    const idxStr = green(`${idx}`);
    console.log(`${indent}${edge} → ${idxStr} ${type.type}:${type.title}`);
    if (type.type == "union") {
      console.log(`${indent}anyOf → ids [${type.anyOf.join(", ")}]`);
      for (const id of type.anyOf) {
        const type = tg.types[id];
        console.log(`${indent} * ${type.type}:${type.title}`);
      }
    } else if (type.type == "either") {
      console.log(`${indent}oneOf → ids [${type.oneOf.join(", ")}]`);
      for (const id of type.oneOf) {
        const type = tg.types[id];
        console.log(`${indent} * ${type.type}:${type.title}`);
      }
    }
    return path.edges.length < depth;
  }, { allowCircular: true });
}

export function isInjected(tg: TypeGraphDS, t: TypeNode): boolean {
  return t.injection != null ||
    (isObject(t) &&
      Object.values(t.properties).map((propIdx) => tg.types[propIdx])
        .every((nested) => isInjected(tg, nested)));
}
