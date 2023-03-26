// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { expandGlobSync, projectDir, runOrExit, WalkEntry } from "./mod.ts";

const tsFiles = [
  ...expandGlobSync("typegate/{src,tests}/**/*.ts", {
    root: projectDir,
    globstar: true,
  }),
].map((f: WalkEntry) => f.path);

const denoConfigPath = "typegate/deno.json";
//const denoConfig = JSON.stringify(await Deno.readTextFile(denoConfigPath));

/*
await runOrExit([
  "deno",
  "cache",
  `--config=${denoConfigPath}`,
  "--unstable",
  "--reload",
  "--lock-write",
  ...tsFiles,
], projectDir);
*/
