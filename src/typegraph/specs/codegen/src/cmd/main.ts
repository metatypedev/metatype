// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as fs from "@std/fs";
import { getCodeGenerator, getTypeDefSources } from "./utils.ts";

const targets = ["typescript", "python", "rust-lib", "rust-rpc"];

const usage = `Typegraph client SDK codegen tool

Usage: tg-codegen [target] [outdir] (target: ${targets.join(", ")})`;

const [target, outDir] = Deno.args;

if (!target || target === "--help" || target === "-h") {
  console.log(usage);
  Deno.exit(1);
}

const generator = getCodeGenerator(target);

if (!outDir || Deno.args.length > 2 || !generator) {
  console.error("Error: Invalid parameters, use --help to display the usage");
  Deno.exit(1);
}

console.log(`Generating ${target} types and bindings...`);

if (!fs.existsSync(outDir)) {
  Deno.mkdirSync(outDir);
}

const sources = getTypeDefSources();

generator.generate(sources, outDir);

console.log("Done");
