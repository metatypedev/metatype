// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { projectDir, runOrExit } from "./utils.ts";
import { bytes, formatDuration, resolve } from "./deps.ts";

const cargoManifestPath = resolve(projectDir, "Cargo.toml");

const arg = Deno.args[0];
if (!arg) {
  const usage =
    "Usage: deno run -A tools/typegraph-size.ts <path-to-typegraph>";
  console.error(usage);
  Deno.exit(1);
}

const tempDir = await Deno.makeTempDir();
const tgJsonPath = resolve(tempDir, "typegraph.json");

const cmd = [
  "cargo",
  "run",
  "--manifest-path",
  cargoManifestPath,
  "-p",
  "meta-cli",
  "--",
  "serialize",
  "-o",
  tgJsonPath,
  ...Deno.args,
];

if (!Deno.args.includes("-1")) {
  cmd.push("-1");
}

const start = performance.now();

await runOrExit(cmd);
const processEnd = performance.now();

console.log();
console.log("Serialization time:", formatDuration(processEnd - start));

const typegraphStr = await Deno.readTextFile(tgJsonPath);
const typegraph = JSON.parse(typegraphStr);

console.log();
console.log("Typegraph:", typegraph.types[0].title);
console.log("Size:", bytes(typegraphStr.length));
console.log("Type count:", typegraph.types.length);
