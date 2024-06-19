// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { expandGlobSync } from "https://deno.land/std@0.224.0/fs/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

type Replacer = {
  path: string;
  op: (s: string) => string;
};

const basePath = "../sdk/src/gen";

const replacements = [
  // Imports should refer to the actual file
  ...Array.from(
    expandGlobSync(basePath + "/**/*.d.ts", {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    })
  ).map(({ path }) => ({
    path,
    op: (s: string) => s.replace(/^(import .*)(\.js)\';$/, "$1.d.ts';"),
  })),
  // Remove exports aliases
  {
    path: resolve(thisDir, basePath + "/typegraph_core.js"),
    op: (s: string) => s.replaceAll(/,\s*\w+ as '[\w:\/]+'/g, ""),
  },
  // Normalize native node imports
  {
    path: resolve(thisDir, basePath + "/typegraph_core.js"),
    op: (s: string) => s.replaceAll("fs/promises", "node:fs/promises"),
  },
] as Array<Replacer>;

console.log("Fixing declarations..");
for (const { path, op } of replacements) {
  const text = Deno.readTextFileSync(path);
  const rewrite = [...text.split("\n")];

  for (let i = 0; i < rewrite.length; i += 1) {
    rewrite[i] = op(rewrite[i]);
  }

  const newText = rewrite.join("\n");
  if (text != newText) {
    console.log(`  Fixed generated code in ${path.replace(thisDir, "")}`);
    Deno.writeTextFileSync(path, newText);
  }
}
