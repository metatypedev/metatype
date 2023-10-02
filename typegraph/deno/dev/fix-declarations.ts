// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import { expandGlobSync } from "https://deno.land/std@0.202.0/fs/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

const replacements = [
  ...Array.from(expandGlobSync("../src/gen/**/*.d.ts", {
    root: thisDir,
    includeDirs: false,
    globstar: true,
  })).map(({ path }) => ({
    path,
    op: (s: string) => s.replace(/^(import .*)(?<!\.ts)\';$/, "$1.d.ts';"),
  })),
  {
    path: resolve(thisDir, "../src/gen/typegraph_core.js"),
    op: (s: string) => s.replaceAll(/,\s*\w+ as '[\w:\/]+'/g, ""),
  },
];

for (
  const { path, op } of replacements
) {
  const text = Deno.readTextFileSync(path);
  const rewrite = [...text.split("\n")];

  for (let i = 0; i < rewrite.length; i += 1) {
    rewrite[i] = op(rewrite[i]);
  }

  const newText = rewrite.join("\n");
  if (text != newText) {
    console.log(`Fixed generated code in ${path.replace(thisDir, "")}`);
    Deno.writeTextFileSync(path, newText);
  }
}
