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

import { green, objectHash, red } from "./deps.ts";
// FIXME: import from @metatype/typegate
import type { TypeGraphDS } from "../src/typegate/src/typegraph/mod.ts";
import { visitType } from "../src/typegate/src/typegraph/visitor.ts";
import type { TypeNode } from "../src/typegate/src/typegraph/type_node.ts";

// Tries to detect structurally equivalent duplicates by iteratively
// updating composite types to refer to deduped types.
// I.e. optional<A> and optional<B> should be considered duplicates
// if A and B are duplicates of each other.
// This function is not perfect and is not able to detect some
// forms of structural equivalence. Additions to the TypeNode might
// break it.
export function listDuplicatesEnhanced(tg: TypeGraphDS, _rootIdx = 0) {
  // to <- from
  const reducedSetMap = new Map<number, number[]>();
  const reducedSet = new Set<number>();
  let cycleNo = 0;
  const globalKindCounts = {} as Record<string, number>;
  const dupeKindCount = {} as Record<string, number>;
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
      for (const type of tg.types) {
        idx += 1;
        if (reducedSet.has(idx)) {
          continue;
        }
        visitedTypesCount += 1;
        const { title: _title, description: _description, ...structure } = type;
        if (cycleNo == 1) {
          incrementKindCount(type, globalKindCounts);
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
            edges.set(idx, [structure.input, structure.output]);
            addToRevEdges(structure.input, idx);
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
    let cycleDupesFound = 0;
    let cycleDupeBinsFound = 0;
    for (const [_hash, bin] of bins.entries()) {
      if (bin.length > 1) {
        cycleDupeBinsFound += 1;
        cycleDupesFound += bin.length;
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
    if (cycleDupeBinsFound == 0) {
      break;
    }
    console.log("reducing dupe bins", {
      cycleDupesFound,
      cycleDupeBinsFound,
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
  const sortedDupes = [] as [number, number][];
  for (const [toIdx, bin] of reducedSetMap.entries()) {
    if (bin.length > 1) {
      sortedDupes.push([toIdx, bin.length]);
      const toType = tg.types[toIdx];
      incrementKindCount(toType, dupeKindCount);

      // console.log(`${cyan(toType.title)}`);
      for (const fromIdx of bin) {
        const fromType = tg.types[fromIdx];
        incrementKindCount(fromType, dupeKindCount);
        /* const injection = "injection" in fromType
          // deno-lint-ignore no-explicit-any
          ? ` (injection ${(fromType.injection as any).source})`
          : "";
        console.log(
          `    ${
            green(fromIdx.toString())
          } ${fromType.type}:${fromType.title}${injection}`,
        ); */
      }
    }
  }
  sortedDupes.sort((a, b) => a[1] - b[1]);
  const dupesBinsFound = sortedDupes.length;
  const dupesFound = sortedDupes
    .map(([_rootIdx, count]) => count)
    .reduce((a, b) => a + b);
  console.log(
    `${green("dupeCount")} kind:selected dedup root title`,
  );
  for (const [rootIdx, count] of sortedDupes) {
    const type = tg.types[rootIdx];
    console.log(
      `${green(count.toString()) + "dupes"} ${type.type}:${type.title}`,
    );
  }
  console.log(
    `${green("dupeCount")} kind:selected dedup root title`,
  );
  console.log("that's it folks!", {
    globalKindCounts,
    dupeKindCount,
    dupesFound,
    dupesBinsFound,
    totalCycles: cycleNo,
    tgSize: tg.types.length,
  });
}

function incrementKindCount(type: TypeNode, sumMap: Record<string, number>) {
  if (type.title.match(/_where_/)) {
    const key = "prismaWhereFilterRelated";
    sumMap[key] = (sumMap[key] ?? 0) + 1;
  }
  if (type.title.match(/_update_input/)) {
    const key = "prismaUpdateInputRelated";
    sumMap[key] = (sumMap[key] ?? 0) + 1;
  }
  if (type.title.match(/_create_input/)) {
    const key = "prismaCreateInputRelated";
    sumMap[key] = (sumMap[key] ?? 0) + 1;
  }
  if (type.title.match(/_output/)) {
    const key = "prismaOutputRelated";
    sumMap[key] = (sumMap[key] ?? 0) + 1;
  }
  sumMap[type.type] = (sumMap[type.type] ?? 0) + 1;
}

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
          // deno-lint-ignore no-explicit-any
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

// const args = parseArgs(Deno.args, {
//   string: ["root"],
// });
//
// const rootIdx = argToInt(args.root, 0);
//
// const files = args._ as string[];
// if (files.length === 0) {
//   throw new Error("Path to typegraph definition module is required.");
// }
// if (files.length > 1) {
//   throw new Error("Cannot accept more than one file");
// }
// const cmd = [
//   "cargo",
//   "run",
//   "--manifest-path",
//   `${projectDir}/Cargo.toml`,
//   "-p",
//   "meta-cli",
//   "--",
//   "serialize",
//   "-f",
//   files[0],
// ];
// const { stdout } = await new Deno.Command(cmd[0], {
//   args: cmd.slice(1),
//   stdout: "piped",
//   stderr: "inherit",
// }).output();
//
// function argToInt(arg: string | undefined, defaultValue: number): number {
//   const parsed = parseInt(arg ?? `${defaultValue}`);
//   return isNaN(parsed) ? defaultValue : parsed;
// }

let raw = "";
const decoder = new TextDecoder();
for await (const chunk of Deno.stdin.readable) {
  raw += decoder.decode(chunk);
  // do something with the text
}

// const raw = new TextDecoder().decode(stdout),
const tgs: TypeGraphDS[] = JSON.parse(raw);

for (const tg of tgs) {
  listDuplicatesEnhanced(tg, 0);
}
