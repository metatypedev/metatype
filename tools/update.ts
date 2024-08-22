#!/bin/env -S ghjk deno run -A --config=typegate/deno.jsonc

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  $,
  expandGlobSync,
  parseArgs,
  resolve,
  udd,
  WalkEntry,
} from "./deps.ts";
import { projectDir, runOrExit } from "./utils.ts";

const denoConfigPath = resolve(projectDir, "typegate/deno.jsonc");
const devConfigPath = resolve(projectDir, "dev/deps.ts");

const flags = parseArgs(Deno.args, {
  boolean: ["outdated", "upgrade", "cache-only", "src-only"],
  default: {
    outdated: false,
    upgrade: false,
    "cache-only": false,
    "src-only": false,
  },
});

if (flags.outdated || flags.upgrade) {
  for await (const configPath of [denoConfigPath, devConfigPath]) {
    console.log(
      `Checking for updates for ${$.path(projectDir).relative(configPath)}:`,
    );
    const deps = await udd(configPath, { dryRun: flags.outdated });
    console.log();

    const depCats = Object.groupBy(deps, (d) => String(d.success));

    if (depCats["undefined"]) {
      console.log("No upgrade available:");
      for (const dep of depCats["undefined"]) {
        console.log(`- ${dep.initUrl}: ${dep.initVersion}`);
      }
    }

    if (depCats["true"]) {
      console.log("Auto-upgrade available:");
      for (const dep of depCats["true"]) {
        console.log(
          `- ${dep.initUrl}: ${dep.initVersion} → ${dep.message}`,
        );
      }
    }

    if (depCats["false"]) {
      console.log("Unable to upgrade:");
      for (const dep of depCats["false"]) {
        console.log(
          `- ${dep.initUrl}: ${dep.initVersion} → ${dep.message}`,
        );
      }
    }
  }
}

const tsFiles = [
  ...expandGlobSync(
    `typegate/{${flags["src-only"] ? "src" : "src,tests"}}/**/*.ts`,
    {
      root: projectDir,
      globstar: true,
      exclude: [
        "typegate/tests/e2e/nextjs",
        "typegate/tests/runtimes/temporal/worker",
      ],
    },
  ),
].map((f: WalkEntry) => f.path);

await runOrExit([
  Deno.execPath(),
  "cache",
  `--config=${denoConfigPath}`,
  "--unstable-worker-options",
  "--unstable-net",
  ...flags["cache-only"] ? [] : ["--reload", "--lock-write"],
  ...tsFiles,
], projectDir);

/* for (const file of tsFiles) {
  const out = await $`deno info
        --config=${denoConfigPath}
        --unstable-worker-options
        --unstable-net
        ${file}`
    .cwd(projectDir)
    .missing("stdout");
  if (/missing/.test(out)) {
    console.log(file);
    break;
  }
} */
