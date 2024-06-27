// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { METATYPE_VERSION, SDK_PACKAGE_NAME_TS } from "../../../dev/consts.ts";
import { existsSync, expandGlobSync, join } from "../../../dev/deps.ts";
import { removeExtension } from "../../../dev/utils.ts";
import { denoSdkDir, srcDir } from "./common.ts";

const jsrExports = {} as Record<string, string>;
for (
  const { path } of expandGlobSync("./**/*.*", {
    root: srcDir,
    includeDirs: false,
    globstar: true,
  })
) {
  if (/\.(ts|js|mjs)$/.test(path)) {
    const hintFile = `${removeExtension(path)}.d.ts`;
    const sourcePath = existsSync(hintFile) ? hintFile : path;
    const canonRelPath = sourcePath.replace(denoSdkDir, ".");
    const usrRelPath = sourcePath.replace(srcDir, ".");
    jsrExports[usrRelPath] = canonRelPath;
  }
}

Deno.writeTextFileSync(
  join(denoSdkDir, "jsr.json"),
  JSON.stringify(
    {
      name: SDK_PACKAGE_NAME_TS,
      version: METATYPE_VERSION,
      // ungitignore
      // https://jsr.io/docs/troubleshooting#excluded-module-error
      publish: {
        exclude: ["!src/gen"],
      },
      exports: jsrExports,
    },
    null,
    2,
  ),
);
