// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlobSync } from "./deps.ts";
import { projectDir, runOrExit } from "./utils.ts";

const typegraphs = Array.from(
  expandGlobSync("typegate/src/typegraphs/**/*.py", {
    root: projectDir,
    includeDirs: false,
    globstar: true,
  }),
);

for (const file of typegraphs) {
  const target = file.path.replace(/\.py$/, ".json");
  console.log("serializing", file.name);
  await runOrExit([
    "cargo",
    "run",
    "-p",
    "meta-cli",
    "-q",
    "--color",
    "always",
    "--",
    "serialize",
    "-f",
    file.path,
    "-1",
    "--pretty",
    "-o",
    target,
  ]);
}
