// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * Wrapper around docker compose to manage runtime dependencies.
 *
 * Usage: deno run -A env.ts [<dependency1>... <dependencyN>]
 *
 * <dependency>:
 *    name of the docker-compose file / runtime dependency
 */

import { basename, expandGlobSync } from "./deps.ts";
import { projectDir, runOrExit } from "./utils.ts";

const dcs = [
  ...expandGlobSync("dev/envs/compose.*.yml", {
    root: projectDir,
    includeDirs: false,
    globstar: true,
  }),
];
const envs = Object.fromEntries(
  dcs
    .map((e) => [basename(e.path).split(".")[1], e.path]),
);

const on = new Set<string>();
if (Deno.args.length === 1 && Deno.args[0] === "all") {
  Object.values(envs).forEach((e) => on.add(e));
} else {
  for (const arg of Deno.args) {
    if (!envs[arg]) {
      console.log(
        `Unknown env "${arg}", available: ${
          Object.keys(envs).join(", ")
        } or "all".`,
      );
      Deno.exit(1);
    }
    on.add(envs[arg]);
  }
}

if (on.size > 0) {
  await runOrExit([
    "docker",
    "compose",
    ...Array.from(on).flatMap((f) => ["-f", f]),
    "up",
    "-d",
    "--remove-orphans",
  ]);
} else {
  await runOrExit([
    "docker",
    "compose",
    ...Object.values(envs).flatMap((f) => ["-f", f]),
    "down",
    "--remove-orphans",
  ]);
}
