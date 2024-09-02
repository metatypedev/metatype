// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { resolve } from "../deps.ts";
import { projectDir } from "../utils.ts";

export const denoSdkDir = resolve(projectDir, "./src/typegraph/deno");
export const srcDir = resolve(denoSdkDir, "src");
export const outDir = resolve(projectDir, "./src/typegraph/node");

export function fromRoot(relPath: string) {
  return resolve(projectDir, relPath);
}
