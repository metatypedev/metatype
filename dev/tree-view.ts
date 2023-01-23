// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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

import * as flags from "https://deno.land/std@0.170.0/flags/mod.ts";
import { TypeGraphDS } from "../typegate/src/typegraph.ts";
import { treeView } from "../typegate/src/typegraph/utils.ts";

const args = flags.parse(Deno.args, {
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

const process = Deno.run({
  cmd: ["cargo", "run", "-p", "meta-cli", "--", "serialize", "-f", files[0]],
  stdout: "piped",
  stderr: "inherit",
});

const tgs: TypeGraphDS[] = JSON.parse(
  new TextDecoder().decode(await process.output()),
);

for (const tg of tgs) {
  treeView(tg, rootIdx, depth);
}

function argToInt(arg: string | undefined, defaultValue: number): number {
  const parsed = parseInt(arg ?? `${defaultValue}`);
  return isNaN(parsed) ? defaultValue : parsed;
}
