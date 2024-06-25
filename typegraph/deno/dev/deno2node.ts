// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  copySync,
  dnt,
  expandGlobSync,
  join,
  resolve,
} from "../../../dev/deps.ts";
import { projectDir } from "../../../dev/utils.ts";
import {
  METATYPE_VERSION,
  SDK_PACKAGE_NAME_TS,
  TAGLINE,
} from "../../../dev/consts.ts";

// Direct node users need to use module
// module = Node16 or moduleResolution = Node16 inside tsconfig.json seems to be enough
// https://github.com/denoland/dnt/issues/205

const srcDir = resolve(projectDir, "./typegraph/deno/sdk/src");
const outDir = resolve(projectDir, "./typegraph/node");
await dnt.emptyDir(outDir);

const entryPoints: dnt.BuildOptions["entryPoints"] = [join(srcDir, "index.ts")];
for (
  const { name, path } of expandGlobSync("./**/*.ts", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
  })
) {
  const relPath = path.replace(srcDir, ".");
  if (name !== "index.ts") {
    entryPoints.push({
      name: relPath.substring(0, relPath.lastIndexOf(".")), // strip extension
      path,
    });
  } else {
    console.log("  Skipped", path);
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
    name: SDK_PACKAGE_NAME_TS,
    version: METATYPE_VERSION,
    description: TAGLINE,
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
    // Copy assets
    copySync(
      resolve(projectDir, "./dev/LICENSE-MPL-2.0.md"),
      resolve(outDir, "./LICENCE.md"),
    );
    copySync(
      resolve(
        projectDir,
        "./typegraph/deno/sdk/src/gen/typegraph_core.core.wasm",
      ),
      join(outDir, "./esm/gen/typegraph_core.core.wasm"),
    );

    // FIXME:
    // jco generated standalone .d.ts are never resolved?
    // 1. `deno publish --dry-run` fails
    // 2. dnt assumes .d.ts files are always linked to js files
    //    so `pnpm dlx jsr publish --dry-run` doesn't work either

    // build jsr.json

    // const jsrExports = {} as Record<string, string>;
    // for (const { path } of expandGlobSync("./**/*.*", {
    //   root: srcDir,
    //   includeDirs: false,
    //   globstar: true,
    // })) {
    //   if (/.(d.ts|ts|js|mjs)$$/.test(path)) {
    //     if (path.endsWith(".d.ts")) {
    //       const relPath = path.replace(srcDir, ".");
    //       jsrExports[relPath] = relPath;
    //     } else {
    //       const relPath = path.replace(srcDir, ".");
    //       jsrExports[relPath] = relPath;
    //     }
    //   }
    // }

    // Deno.writeTextFileSync(
    //   join(srcDir, "jsr.json"),
    //   JSON.stringify(
    //     {
    //       name: SDK_PACKAGE_NAME_TS,
    //       version: METATYPE_VERSION,
    //       license: "MPL-2.0",
    //       exports: jsrExports,
    //     },
    //     null,
    //     2
    //   )
    // );
  },
});
