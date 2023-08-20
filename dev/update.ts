// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  expandGlobSync,
  groupBy,
  parseFlags,
  resolve,
  udd,
  WalkEntry,
} from "./deps.ts";
import { projectDir, relPath, runOrExit } from "./utils.ts";

const denoConfigPath = resolve(projectDir, "typegate/deno.json");
const devConfigPath = resolve(projectDir, "dev/deps.ts");

const flags = parseFlags(Deno.args, {
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
      `Checking for updates for ${relPath(configPath)}:`,
    );
    const deps = await udd(configPath, { dryRun: flags.outdated });
    console.log();

    const depCats = groupBy(deps, (d) => String(d.success));

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
    },
  ),
].map((f: WalkEntry) => f.path);

await runOrExit([
  "deno",
  "cache",
  `--config=${denoConfigPath}`,
  "--unstable",
  ...flags["cache-only"] ? [] : ["--reload", "--lock-write"],
  ...tsFiles,
], projectDir);
