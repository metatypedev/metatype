import { join } from "https://deno.land/std/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

const outPath =
  new URL("../grammars/typescript.wasm", import.meta.url).pathname;

const tmpDirPath = new URL("../../../tmp/lsp", import.meta.url).pathname;

Deno.mkdirSync(tmpDirPath, { recursive: true });

if (!existsSync(join(tmpDirPath, "tree-sitter-typescript"))) {
  console.log("> cloning tree-sitter-typescript to", tmpDirPath);
  const out = new Deno.Command("git", {
    cwd: tmpDirPath,
    stdout: "inherit",
    stderr: "inherit",
    args: [
      "clone",
      "https://github.com/tree-sitter/tree-sitter-typescript.git",
      "--depth",
      "1",
    ],
  }).outputSync();

  if (out.code !== 0) {
    console.error(out);
    Deno.exit(out.code);
  }
} else {
  // TODO --offline option
  console.log("> pulling tree-sitter-typescript");
  const out = new Deno.Command("git", {
    cwd: join(tmpDirPath, "tree-sitter-typescript"),
    stdout: "inherit",
    stderr: "inherit",
    args: ["pull"],
  }).outputSync();

  if (out.code !== 0) {
    console.error(out);
    Deno.exit(out.code);
  }
}

// check if emcc is installed
try {
  new Deno.Command("emcc", {
    stdout: "piped",
    stderr: "piped",
    args: ["--version"],
  }).outputSync();
} catch (_e) {
  console.error("Ensure that you have emscripten installed.");
  Deno.exit(1);
}

console.log("> building tree-sitter-typescript wasm grammar");
const out = new Deno.Command("tree-sitter", {
  cwd: join(tmpDirPath, "tree-sitter-typescript/typescript"),
  stdout: "inherit",
  stderr: "inherit",
  args: ["build-wasm"],
}).outputSync();

if (out.code !== 0) {
  console.error(out);
  Deno.exit(out.code);
}

Deno.copyFileSync(
  join(
    tmpDirPath,
    "tree-sitter-typescript/typescript/tree-sitter-typescript.wasm",
  ),
  outPath,
);
console.log("> wasm grammar generated at", outPath);
