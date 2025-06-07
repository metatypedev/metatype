// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { CURRENT_VERSION, SDK_PACKAGE_NAME_TS } from "../consts.ts";
import { $, expandGlob, join } from "../deps.ts";
import { copyFilesAt } from "../utils.ts";
import { removeExtension } from "../utils.ts";
import { denoSdkDir, fromRoot, srcDir } from "./common.ts";

// Update license, readme
copyFilesAt(
  {
    destDir: denoSdkDir,
    overwrite: true,
  },
  {
    [fromRoot("README.md")]: "README.md",
    [fromRoot("tools/LICENSE-MPL-2.0.md")]: "LICENSE.md",
  },
);

// Prepare jsr export map
const jsrExports = {
  ".": "./src/index.ts",
  "./deps/_import.ts": "./src/deps/_import.ts",
  "./deps/mod.ts": "./src/deps/mod.ts",
} as Record<string, string>;
for await (
  const { path } of expandGlob("./**/*.*", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
    exclude: [
      "index.ts",
    ],
  })
) {
  if (/\.(ts|js|mjs)$/.test(path)) {
    const text = await $.path(path).readText();
    if (/jsr-private-module/.test(text)) {
      $.logLight("skipping private module", path);
      continue;
    }
    const hintFile = `${removeExtension(path)}.d.ts`;
    const sourcePath = await $.path(hintFile).exists() ? hintFile : path;
    const canonRelPath = sourcePath.replace(denoSdkDir, ".");
    const relPath = sourcePath.replace(srcDir, ".");
    const usrRelPath = path.endsWith(".d.ts")
      ? relPath
      : removeExtension(relPath);
    jsrExports[usrRelPath] = canonRelPath;
  }
}

Deno.writeTextFileSync(
  join(denoSdkDir, "deno.json"),
  JSON.stringify(
    {
      name: SDK_PACKAGE_NAME_TS,
      version: CURRENT_VERSION,
      // ungitignore
      // https://jsr.io/docs/troubleshooting#excluded-module-error
      publish: {
        exclude: ["!src/gen", "!LICENSE.md", "!README.md"],
      },
      lint: {
        rules: {
          exclude: [
            "no-external-import",
          ],
        },
      },
      exports: jsrExports,
    },
    null,
    2,
  ) + "\n",
);
