// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { projectDir, runOrExit } from "./utils.ts";
import { bytes, resolve } from "./deps.ts";

const cargoManifestPath = resolve(projectDir, "Cargo.toml");

const arg = Deno.args[0];
if (!arg) {
  const usage = "Usage: deno run -A dev/typegraph-size.ts <path-to-typegraph>";
  console.error(usage);
  Deno.exit(1);
}

const cmd = [
  "cargo",
  "run",
  "--manifest-path",
  cargoManifestPath,
  "-p",
  "meta-cli",
  "--",
  "serialize",
  ...Deno.args,
];

if (!Deno.args.includes("-1")) {
  cmd.push("-1");
}

const out = await runOrExit(cmd, { bufferedOutput: { stdout: true } });
const decoded = new TextDecoder().decode(out.stdout!);

const typegraph = JSON.parse(decoded);

console.log();
console.log("Typegraph:", typegraph.types[0].title);
console.log("Size:", bytes(decoded.length));

console.log("Type count:", typegraph.types.length);
