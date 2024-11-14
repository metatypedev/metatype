// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dnt, expandGlobSync, join } from "../deps.ts";
import { copyFilesAt, removeExtension } from "..//utils.ts";
import { METATYPE_VERSION, SDK_PACKAGE_NAME_TS, TAGLINE } from "../consts.ts";
import { fromRoot, outDir } from "./common.ts";
import { srcDir } from "./common.ts";

// Direct node users need to use module
// module = Node16 or moduleResolution = Node16 inside tsconfig.json seems to be enough
// https://github.com/denoland/dnt/issues/205

console.log("deno2node");
await dnt.emptyDir(outDir);

const entryPoints: dnt.BuildOptions["entryPoints"] = [join(srcDir, "index.ts")];
for (
  const { name, path } of expandGlobSync("./**/*.*", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
  })
) {
  if (path.endsWith(".d.ts")) {
    continue;
  }
  if (!/.(js|ts)$/.test(path)) {
    continue;
  }

  const relPath = path.replace(srcDir, ".");
  if (name !== "index.ts") {
    entryPoints.push({
      name: removeExtension(relPath),
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
    copyFilesAt(
      {
        destDir: outDir,
        overwrite: true,
      },
      {
        [fromRoot("README.md")]: "README.md",
        [fromRoot("tools/LICENSE-MPL-2.0.md")]: "LICENSE.md",
      },
    );
  },
});
