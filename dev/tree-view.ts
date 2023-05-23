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
