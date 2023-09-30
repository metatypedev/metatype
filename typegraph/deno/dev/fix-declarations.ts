// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.202.0/path/mod.ts";
export const genDir = dirname(fromFileUrl(import.meta.url));

for (
  const path of [
    resolve(genDir, "../gen/interfaces/metatype-typegraph-runtimes.d.ts"),
    resolve(genDir, "../gen/typegraph_core.d.ts"),
  ]
) {
  const text = Deno.readTextFileSync(path);
  const rewrite = [...text.split("\n")];

  for (let i = 0; i < rewrite.length; i += 1) {
    rewrite[i] = rewrite[i].replace(/^(import .*)(?<!\.ts)\';$/, "$1.d.ts';");
  }

  const newText = rewrite.join("\n");
  if (text != newText) {
    console.log(`- Updated ${path.replace(genDir, "")}`);
    Deno.writeTextFileSync(path, newText);
  } else {
    console.log(`- No change ${path.replace(genDir, "")}`);
  }
}
