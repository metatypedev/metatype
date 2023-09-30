// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.202.0/path/mod.ts";
export const genDir = dirname(fromFileUrl(import.meta.url));

const fixImports = (s: string) =>
  s.replace(/^(import .*)(?<!\.ts)\';$/, "$1.d.ts';");

const replacements = [
  {
    path: resolve(
      genDir,
      "../src/gen/interfaces/metatype-typegraph-runtimes.d.ts",
    ),
    op: fixImports,
  },
  {
    path: resolve(genDir, "../src/gen/typegraph_core.d.ts"),
    op: fixImports,
  },
  {
    path: resolve(genDir, "../src/gen/typegraph_core.js"),
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
    console.log(`- Updated ${path.replace(genDir, "")}`);
    Deno.writeTextFileSync(path, newText);
  } else {
    console.log(`- No change ${path.replace(genDir, "")}`);
  }
}
