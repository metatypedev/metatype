// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { METATYPE_VERSION, SDK_PACKAGE_NAME_TS } from "../consts.ts";
import { $, existsSync, expandGlob, join } from "../deps.ts";
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
const jsrExports = {} as Record<string, string>;
for await (
  const { path } of expandGlob("./**/*.*", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
  })
) {
  if (/\.(ts|js|mjs)$/.test(path)) {
    const text = await $.path(path).readText();
    if (/jsr-private-module/.test(text)) {
      $.logLight("skipping private module", path);
      continue;
    }
    const hintFile = `${removeExtension(path)}.d.ts`;
    const sourcePath = existsSync(hintFile) ? hintFile : path;
    const canonRelPath = sourcePath.replace(denoSdkDir, ".");
    const usrRelPath = sourcePath.replace(srcDir, ".");
    jsrExports[usrRelPath] = canonRelPath;
  }
}

Deno.writeTextFileSync(
  join(denoSdkDir, "deno.json"),
  JSON.stringify(
    {
      name: SDK_PACKAGE_NAME_TS,
      version: METATYPE_VERSION,
      // ungitignore
      // https://jsr.io/docs/troubleshooting#excluded-module-error
      publish: {
        exclude: ["!src/gen", "!LICENSE.md", "!README.md"],
      },
      exports: jsrExports,
    },
    null,
    2,
  ) + "\n",
);
