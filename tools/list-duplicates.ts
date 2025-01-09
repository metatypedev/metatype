#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

/**
 * Usage:
 *   meta serialize -f my_tg.py | deno run -A tools/list-duplicates.ts [<options>]
 *
 * Options:
 *    --root <N>    The index of the root type
 *                  Default: 0
 */

import { cyan, green, objectHash, parseArgs, red } from "./deps.ts";
// FIXME: import from @metatype/typegate
import type { TypeGraphDS } from "../src/typegate/src/typegraph/mod.ts";
import { visitType } from "../src/typegate/src/typegraph/visitor.ts";
import { TypeNode } from "../src/typegate/src/typegraph/type_node.ts";

let whereTypeCount = 0;
let optionalTypeCount = 0;

export function listDuplicates(tg: TypeGraphDS, rootIdx = 0) {
  const bins = new Map<string, readonly [number, TypeNode][]>();
  const duplicateNameBins = new Map<string, readonly [number, TypeNode][]>();
  visitType(tg, rootIdx, ({ type, idx }) => {
    const { title, description: _description, ...structure } = type;
    // deno-lint-ignore no-explicit-any
    const hash = objectHash(structure as any);
    bins.set(hash, [...bins.get(hash) ?? [], [idx, type] as const]);
    duplicateNameBins.set(title, [
      ...duplicateNameBins.get(title) ?? [],
      [idx, type] as const,
    ]);
    if (title.match(/_where_/)) {
      whereTypeCount++;
    }
    if (type.type == "optional") {
      optionalTypeCount++;
    }
    return true;
  }, { allowCircular: false });
  for (const [hash, bin] of bins.entries()) {
    if (bin.length > 1) {
      console.log(`${cyan(hash)}`);
      for (const [idx, type] of bin) {
        const injection = "injection" in type
          // deno-lint-ignore no-explicit-any
          ? ` (injection ${(type.injection as any).source})`
          : "";
        console.log(
          `    ${green(idx.toString())} ${type.type}:${type.title}${injection}`,
        );
      }
    }
  }
  for (const [hash, bin] of duplicateNameBins.entries()) {
    if (bin.length > 1) {
      console.log(`${red(hash)}`);
      for (const [idx, type] of bin) {
        const injection = "injection" in type
          // deno-lint-ignore no-explicit-any
          ? ` (injection ${(type.injection as any).source})`
          : "";
        console.log(
          `    ${green(idx.toString())} ${type.type}:${type.title}${injection}`,
        );
      }
    }
  }
}

const args = parseArgs(Deno.args, {
  string: ["root"],
});

const rootIdx = argToInt(args.root, 0);

/* const files = args._ as string[];
if (files.length === 0) {
  throw new Error("Path to typegraph definition module is required.");
}
if (files.length > 1) {
  throw new Error("Cannot accept more than one file");
}
const cmd = [
  "cargo",
  "run",
  "--manifest-path",
  `${projectDir}/Cargo.toml`,
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
}).output(); */

const decoder = new TextDecoder();
let raw = "";
for await (const chunk of Deno.stdin.readable) {
  raw += decoder.decode(chunk);
}

const tgs: TypeGraphDS[] = JSON.parse(raw);

for (const tg of tgs) {
  listDuplicates(tg, rootIdx);
}

console.log({ whereTypeCount, optionalTypeCount });

function argToInt(arg: string | undefined, defaultValue: number): number {
  const parsed = parseInt(arg ?? `${defaultValue}`);
  return isNaN(parsed) ? defaultValue : parsed;
}
