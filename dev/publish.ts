// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dnt, expandGlobSync, resolve } from "./deps.ts";
import { getLockfile, projectDir } from "./utils.ts";

// Direct node users need to use module
// module = Node16 or moduleResolution = Node16 inside tsconfig.json seems to be enough
// https://github.com/denoland/dnt/issues/205

const lockfile = await getLockfile();

const srcDir = resolve(projectDir, "./typegraph/deno/src");
const outDir = resolve(projectDir, "./typegraph/node");
await dnt.emptyDir(outDir);

const entryPoints: dnt.BuildOptions["entryPoints"] = ["./mod.ts"];
for (
  const { name, path } of expandGlobSync("./**/*.ts", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
  })
) {
  const relPath = path.replace(srcDir, ".");
  if (
    !relPath.startsWith("./gen") && !name.startsWith("_") && name !== "mod.ts"
  ) {
    entryPoints.push({
      name: relPath.slice(0, -3),
      path: relPath,
    });
  }
}

// runs in cwd: https://github.com/denoland/dnt/issues/337
await dnt.build({
  entryPoints,
  outDir,
  shims: {
    deno: true,
  },
  compilerOptions: {
    target: "ES2020",
  },
  test: false,
  scriptModule: false, // only generate ESM
  typeCheck: "single",
  packageManager: "pnpm",
  package: {
    name: "@typegraph/sdk",
    version: lockfile.dev.lock.METATYPE_VERSION,
    description: lockfile.dev.lock.TAGLINE,
    license: "MPL-2.0",
    repository: {
      type: "git",
      url: "git+https://github.com/metatypedev/metatype.git",
    },
    bugs: {
      url: "https://github.com/metatypedev/metatype/issues",
    },
  },
  postBuild() {
    const wasm = "./typegraph/deno/src/gen/typegraph_core.core.wasm";
    const files = [
      ["./dev/LICENSE-MPL-2.0.md", "./LICENSE.md"],
      [wasm, "./esm/gen/typegraph_core.core.wasm"],
    ];
    for (const [src, dest] of files) {
      Deno.copyFileSync(resolve(projectDir, src), resolve(outDir, dest));
    }
    // remove source (comment when debugging)
    Deno.removeSync(resolve(outDir, "src"), { recursive: true });
  },
});
