// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraphDS } from "../typegraph.ts";
import { visitType } from "./visitor.ts";
import { cyan, green } from "std/fmt/colors.ts";

export function treeView(tg: TypeGraphDS, rootIdx = 0, depth = 4) {
  visitType(tg, rootIdx, ({ type, idx, path }) => {
    const indent = "    ".repeat(path.edges.length);
    const edge = cyan(`${path.edges[path.edges.length - 1] ?? "[root]"}`);
    const idxStr = green(`${idx}`);
    console.log(`${indent}${edge} → ${idxStr} ${type.type}:${type.title}`);
    return path.edges.length < depth;
  }, { allowCircular: true });
}
