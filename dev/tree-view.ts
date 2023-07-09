// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Usage:
 *   deno run -A dev/tree-view.ts --import-map typegate/deno-import.json [<options>] <file.py>
 *
 * Options:
 *    --depth <N>   The depth of the tree
 *                  Default: 6
 *    --root <N>    The index of the root type
 *                  Default: 0
 */

import { cyan, green, parseFlags } from "./deps.ts";
import { TypeGraphDS } from "../typegate/src/typegraph.ts";
import { visitType } from "../typegate/src/typegraph/visitor.ts";

export function treeView(tg: TypeGraphDS, rootIdx = 0, depth = 4) {
  visitType(tg, rootIdx, ({ type, idx, path }) => {
    const indent = "    ".repeat(path.edges.length);
    const edge = cyan(`${path.edges[path.edges.length - 1] ?? "[root]"}`);
    const idxStr = green(`${idx}`);
    console.log(`${indent}${edge} → ${idxStr} ${type.type}:${type.title}`);
    return path.edges.length < depth;
  }, { allowCircular: true });
}

const args = parseFlags(Deno.args, {
  string: ["depth", "root"],
});

const depth = argToInt(args.depth, 6);
const rootIdx = argToInt(args.root, 0);

const files = args._ as string[];
if (files.length === 0) {
  throw new Error("Path to typegraph definition module is required.");
}
if (files.length > 1) {
  throw new Error("Cannot accept more than one file");
}
const cmd = [
  "cargo",
  "run",
  "-p",
  "meta-cli",
  "--",
  "serialize",
  "-f",
  files[0],
];
const { stdout } = await new Deno.Command(cmd[0], {
  args: cmd.slice(1),
  stdout: "piped",
  stderr: "inherit",
}).output();

const tgs: TypeGraphDS[] = JSON.parse(
  new TextDecoder().decode(stdout),
);

for (const tg of tgs) {
  treeView(tg, rootIdx, depth);
}

function argToInt(arg: string | undefined, defaultValue: number): number {
  const parsed = parseInt(arg ?? `${defaultValue}`);
  return isNaN(parsed) ? defaultValue : parsed;
}
