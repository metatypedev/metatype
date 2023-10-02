// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  dirname,
  fromFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import { expandGlobSync } from "https://deno.land/std@0.202.0/fs/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

for (
  const { path } of expandGlobSync("../gen/**/*.d.ts", {
    root: thisDir,
    includeDirs: false,
    globstar: true,
  })
) {
  const text = Deno.readTextFileSync(path);
  const rewrite = [...text.split("\n")];

  for (let i = 0; i < rewrite.length; i += 1) {
    rewrite[i] = rewrite[i].replace(/^(import .*)(?<!\.ts)\';$/, "$1.d.ts';");
  }

  const newText = rewrite.join("\n");
  if (text != newText) {
    console.log(`Fixed import in ${path.replace(thisDir, "")}`);
    Deno.writeTextFileSync(path, newText);
  }
}
