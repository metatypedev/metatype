#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

/**
 * Usage:
 *   deno run -A tools/list-duplicates.ts [<options>] <file.py>
 *
 * Options:
 *    --root <N>    The index of the root type
 *                  Default: 0
 */

import { cyan, green, red, objectHash, parseArgs } from "./deps.ts";
// FIXME: import from @metatype/typegate
import type { TypeGraphDS } from "../src/typegate/src/typegraph/mod.ts";
import { visitType } from "../src/typegate/src/typegraph/visitor.ts";
import { projectDir } from "./utils.ts";
import { TypeNode } from "../src/typegate/src/typegraph/type_node.ts";

export function listDuplicatesEnhanced(tg: TypeGraphDS, _rootIdx = 0) {
  // to <- from
  const reducedSetMap = new Map<number, number[]>();
  const reducedSet = new Set<number>();
  let cycleNo = 0;
  let whereTypeCount = 0;
  let optionalTypeCount = 0;
  const theWheres = [] as [number, TypeNode][];
  while (true) {
    cycleNo += 1;
    const bins = new Map<string, [number, TypeNode][]>();
    const edges = new Map<number, number[]>();
    const revEdges = new Map<number, number[]>();

    const addToRevEdges = (of: number, idx: number) => {
      const prev = revEdges.get(of);
      if (prev) {
        prev.push(idx);
      } else {
        revEdges.set(of, [idx]);
      }
    };

    let visitedTypesCount = 0;
    {
      let idx = -1;
      /* visitType(tg, rootIdx, ({ type, idx }) => {
    }, { allowCircular: false }); */
      for (const type of tg.types) { idx += 1;
        if (reducedSet.has(idx)) {
          continue;
        }
        visitedTypesCount += 1;
        const { title, description: _description, ...structure } = type;
        if (cycleNo == 1) {
          if (title.match(/_where_/)) {
            if (type.type != "optional") {
              theWheres.push([idx, type]);
              whereTypeCount++;
            }
          }
          if (type.type == "optional") {
            optionalTypeCount++;
          }
        }
        // deno-lint-ignore no-explicit-any
        const hash = objectHash(structure as any);
        {
          const prev = bins.get(hash);
          if (prev) {
            prev.push([idx, type] as const);
          } else {
            bins.set(hash, [[idx, type]]);
          }
        }
        switch (structure.type) {
          case "function":
            edges.set(idx, [structure.input]);
            addToRevEdges(structure.input, idx);
            edges.set(idx, [structure.output]);
            addToRevEdges(structure.output, idx);
            break;
          case "object":
            edges.set(idx, Object.values(structure.properties));
            for (const dep of Object.values(structure.properties)) {
              addToRevEdges(dep, idx);
            }
            break;
          case "either":
            edges.set(idx, structure.oneOf);
            for (const dep of structure.oneOf) {
              addToRevEdges(dep, idx);
            }
            break;
          case "union":
            edges.set(idx, structure.anyOf);
            for (const dep of structure.anyOf) {
              addToRevEdges(dep, idx);
            }
            break;
          case "list":
            edges.set(idx, [structure.items]);
            addToRevEdges(structure.items, idx);
            break;
          case "optional":
            edges.set(idx, [structure.item]);
            addToRevEdges(structure.item, idx);
            break;
          case "boolean":
          case "string":
          case "file":
          case "integer":
          case "float":
            // case "any":
            break;
          default:
            throw new Error(`unsupported type: ${type.type}`);
        }
      }
    }

    const dedupIndices = new Map<number, number>();
    let dupesFound = 0;
    let dupesBinsFound = 0;
    for (const [_hash, bin] of bins.entries()) {
      if (bin.length > 1) {
        dupesBinsFound += 1;
        dupesFound += bin.length;
        const dedupedIdx = bin[0][0];
        const set = reducedSetMap.get(dedupedIdx) ?? [];
        for (const [idx, _type] of bin.slice(1)) {
          const removed = reducedSetMap.get(idx);
          if (removed) {
            reducedSetMap.delete(idx);
            set.push(...removed);
          }
          set.push(idx);
          reducedSet.add(idx);
          dedupIndices.set(idx, dedupedIdx);
        }
        reducedSetMap.set(dedupedIdx, set);
      }
    }
    if (dupesBinsFound == 0) {
      break;
    }
    console.log("reducing dupe bins", {
      dupesFound,
      dupesBinsFound,
      reducedSetCount: reducedSet.size,
      visitedTypesCount,
      cycleNo,
    });
    for (const [from, to] of dedupIndices) {
      const itemsToUpdate = revEdges.get(from) ?? [];
      for (const targetIdx of itemsToUpdate) {
        const type = tg.types[targetIdx];
        const noMatchError = () => {
          console.log("no match on dupe reduction", {
            from: tg.types[from],
            to: tg.types[to],
            target: type,
          });
          return Error("no match on dupe reduction");
        };
        switch (type.type) {
          case "function":
            if (type.input == from) {
              type.input = to;
            } else if (type.output == from) {
              type.output = to;
            } else {
              throw noMatchError();
            }
            break;
          case "object": {
            let updated = false;
            for (const [key, id] of Object.entries(type.properties)) {
              if (id == from) {
                type.properties[key] = to;
                updated = true;
                break;
              }
            }
            if (!updated) {
              throw noMatchError();
            }
            break;
          }
          case "either": {
            const updateIdx = type.oneOf.indexOf(from);
            if (updateIdx == -1) {
              throw noMatchError();
            }
            type.oneOf[updateIdx] = to;
            break;
          }
          case "union": {
            const updateIdx = type.anyOf.indexOf(from);
            if (updateIdx == -1) {
              throw noMatchError();
            }
            type.anyOf[updateIdx] = to;
            break;
          }
          case "list":
            type.items = to;
            break;
          case "optional":
            type.item = to;
            break;
          case "boolean":
          case "string":
          case "file":
          case "integer":
          case "float":
            throw new Error("impossible");
          default:
            throw new Error(`unsupported type: ${type.type}`);
        }
      }
    }
  }
  let dupesFound = 0;
  let dupesBinsFound = 0;
  for (const [toIdx, bin] of reducedSetMap.entries()) {
    dupesBinsFound += 1;
    if (bin.length > 1) {
      dupesFound += bin.length;
      const toType = tg.types[toIdx];

      console.log(`${cyan(toType.title)}`);
      for (const fromIdx of bin) {
        const fromType = tg.types[fromIdx];
        const injection = "injection" in fromType
          // deno-lint-ignore no-explicit-any
          ? ` (injection ${(fromType.injection as any).source})`
          : "";
        console.log(
          `    ${
            green(fromIdx.toString())
          } ${fromType.type}:${fromType.title}${injection}`,
        );
      }
    }
  }
  /* theWheres.sort((a, b) => a[1].title.localeCompare(b[1].title));
  for (const [idx, type] of theWheres) {
    console.log(
      `    ${green(idx.toString())} ${type.type}:${type.title}`,
    );
  } */
  console.log("that's it folks!", {
    dupesFound,
    dupesBinsFound,
    whereTypeCount,
    optionalTypeCount,
  });
}
export function listDuplicates(tg: TypeGraphDS, rootIdx = 0) {
  const bins = new Map<string, readonly [number, TypeNode][]>();
  const duplicateNameBins = new Map<string, readonly [number, TypeNode][]>();
  visitType(tg, rootIdx, ({ type, idx }) => {
    const { title, description: _description, ...structure } = type;
    const hash = objectHash(structure as any);
    bins.set(hash, [...bins.get(hash) ?? [], [idx, type] as const]);
    duplicateNameBins.set(title, [
      ...duplicateNameBins.get(title) ?? [],
      [idx, type] as const,
    ]);
    return true;
  }, { allowCircular: false });
  let dupesBinsFound = 0;
  let dupesFound = 0;
  for (const [_hash, bin] of bins.entries()) {
    if (bin.length > 1) {
      dupesBinsFound += 1;
      dupesFound += bin.length;
      /* console.log(`${cyan(hash)}`);
      for (const [idx, type] of bin) {
        const injection = "injection" in type
          ? ` (injection ${(type.injection as any).source})`
          : "";
        console.log(
          `    ${green(idx.toString())} ${type.type}:${type.title}${injection}`,
        );
      }
        */
    }
  }
  console.log({ dupesFound, dupesBinsFound });
  for (const [hash, bin] of duplicateNameBins.entries()) {
    if (bin.length > 1) {
      console.log(`${red(hash)}`);
      for (const [idx, type] of bin) {
        const injection = "injection" in type
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
}).output();

const tgs: TypeGraphDS[] = JSON.parse(
  new TextDecoder().decode(stdout),
);

for (const tg of tgs) {
  listDuplicatesEnhanced(tg, rootIdx);
}

function argToInt(arg: string | undefined, defaultValue: number): number {
  const parsed = parseInt(arg ?? `${defaultValue}`);
  return isNaN(parsed) ? defaultValue : parsed;
}
