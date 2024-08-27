// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dirname, fromFileUrl, resolve } from "@std/path";
import { expandGlob } from "@std/fs";
import { join, relative } from "../deps.ts";
import { denoSdkDir } from "./common.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

type Replacer = {
  path: string;
  op: (s: string) => string;
};

const basePath = "../../src/typegraph/deno/src/gen";

const replacements = [
  // Imports should refer to the actual file
  ...(await Array.fromAsync(
    expandGlob(join(basePath, "/**/*.d.ts"), {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    }),
  )).map(({ path }) => ({
    path,
    op: (s: string) => s.replace(/^(import .*)(\.js)\';$/, "$1.d.ts';"),
  })),
  // Remove exports aliases
  {
    path: resolve(thisDir, basePath, "typegraph_core.js"),
    op: (s: string) => s.replaceAll(/,\s*\w+ as '[\w:\/]+'/g, ""),
  },
  // Normalize native node imports
  {
    path: resolve(thisDir, basePath, "typegraph_core.js"),
    op: (s: string) =>
      s.replaceAll(/["']fs\/promises["']/g, "'node:fs/promises'"),
  },
] as Array<Replacer>;

console.log("Fixing declarations..");
for (const { path, op } of replacements) {
  const text = await Deno.readTextFile(path);
  const rewrite = [...text.split("\n")];

  for (let i = 0; i < rewrite.length; i += 1) {
    rewrite[i] = op(rewrite[i]);
  }

  const newText = rewrite.join("\n");
  if (text != newText) {
    console.log(`  Fixed generated code at ${relative(thisDir, path)}`);
    await Deno.writeTextFile(path, newText);
  }
}

console.log("Merge types");
// Merge everything at interfaces/*
const merged = (await Array.fromAsync(
  expandGlob(join(basePath, "/interfaces/*.d.ts"), {
    root: thisDir,
    includeDirs: false,
    globstar: true,
  }),
)).reduce((curr, { path }) => {
  console.log(`  < ${path}`);
  const next = `
// ${relative(denoSdkDir, path)}
${
    Deno.readTextFileSync(path)
      .replaceAll(/import type {.+} from ['"].+\.d\.ts['"];/g, (m) => `// ${m}`)
      .replaceAll(/export {.+};/g, (m) => `// ${m}`)
  }
`;
  return curr + next;
}, "");

// Dump everything into typegraph_core.d.ts
// As of jco 1.2.4, typegraph_core.d.ts simply re-exports the types from interfaces/*.d.ts
const hintMainPath = join(thisDir, basePath, "/typegraph_core.d.ts");
let mergedContent = `
// interfaces begin
${merged}
// interfaces end

// common
`;

const dupDecl = ["export type TypeId = number;"];
for (const dup of dupDecl) {
  mergedContent = mergedContent.replaceAll(dup, "");
}
mergedContent += `\n${dupDecl.join("\n")}`;

await Deno.writeTextFile(hintMainPath, mergedContent);
await Deno.remove(join(thisDir, basePath, "/interfaces"), { recursive: true });
