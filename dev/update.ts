// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { expandGlobSync, projectDir, runOrExit, WalkEntry } from "./mod.ts";

const tsFiles = [
  ...expandGlobSync("typegate/{src,tests}/**/*.ts", {
    root: projectDir,
  }),
].map((f: WalkEntry) => f.path);

await runOrExit([
  "deno",
  "cache",
  "--config=typegate/deno.json",
  "--unstable",
  "--reload",
  "--lock-write",
  ...tsFiles,
], projectDir);
