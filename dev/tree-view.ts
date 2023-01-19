// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

/**
 * Usage:
 *   deno run -A dev/tree-view.ts --import-map typegate/deno-import.json [--depth <N>] <file.py>
 */

import * as flags from "https://deno.land/std@0.170.0/flags/mod.ts";
import { TypeGraphDS } from "../typegate/src/typegraph.ts";
import { treeView } from "../typegate/src/typegraph/utils.ts";

const args = flags.parse(Deno.args, {
  string: ["depth"],
});

const defaultDepth = 6;
const parsedDepth = parseInt(args.depth ?? `${defaultDepth}`);
const depth = isNaN(parsedDepth) ? defaultDepth : parsedDepth;

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
  treeView(tg, 0, depth);
}
