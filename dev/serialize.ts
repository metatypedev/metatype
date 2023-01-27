// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { expandGlobSync, projectDir, runOrExit } from "./mod.ts";

const typegraphs = Array.from(
  expandGlobSync("typegate/src/typegraphs/**/*.py", {
    root: projectDir,
    includeDirs: false,
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
