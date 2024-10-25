import * as fs from "@std/fs";
import {
  getCodeGenerator,
  getTypeDefSources,
  isValidTarget,
  validTargets,
} from "./utils.ts";

const usage = `Typegraph client SDK codegen tool

Usage: tg-codegen [target] [outdir] (target: ${validTargets.join(", ")})`;

const [target, outDir] = Deno.args;

if (!target || !outDir || !isValidTarget(target)) {
  console.log(usage);
  Deno.exit(1);
}

if (!fs.existsSync(outDir)) {
  Deno.mkdirSync(outDir);
}

console.log(`Generating ${target} types and bindings...`);

const sources = getTypeDefSources();
const codegen = getCodeGenerator(target);

codegen.generate(sources, outDir);

console.log("Done");
