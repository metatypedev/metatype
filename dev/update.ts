// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.170.0/path/mod.ts";
import {
  expandGlobSync,
  WalkEntry,
} from "https://deno.land/std@0.170.0/fs/mod.ts";

const thisDir = dirname(fromFileUrl(import.meta.url));
const typegateDir = resolve(thisDir, "../typegate");

const tsFiles = [
  ...expandGlobSync("{src,tests}/**/*.ts", {
    root: typegateDir,
  }),
].map((f: WalkEntry) => f.path);

const cmd = [
  "deno",
  "cache",
  "--config=deno.json",
  "--unstable",
  "--reload",
  "--lock-write",
  ...tsFiles,
];

const p = Deno.run({ cmd, cwd: typegateDir });
const status = await p.status();

if (!status.success) {
  Deno.exit(status.code);
}
