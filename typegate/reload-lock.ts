// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  dirname,
  fromFileUrl,
} from "https://deno.land/std@0.170.0/path/mod.ts";
import { expandGlob } from "https://deno.land/std@0.170.0/fs/mod.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

const tsFiles = [];

for await (const entry of expandGlob("src/**/*.ts", { root: localDir })) {
  tsFiles.push(entry.path);
}

const cmd = [
  "deno",
  "cache",
  "--config=deno.json",
  "--unstable",
  "--reload",
  "--lock-write",
  ...tsFiles,
];

const p = Deno.run({ cmd, cwd: localDir });

const status = await p.status();
if (!status.success) {
  Deno.exit(status.code);
}
