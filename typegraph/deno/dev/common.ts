// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { resolve } from "../../../dev/deps.ts";
import { projectDir } from "../../../dev/utils.ts";

export const denoSdkDir = resolve(projectDir, "./typegraph/deno/sdk");
export const srcDir = resolve(denoSdkDir, "src");
export const outDir = resolve(projectDir, "./typegraph/node");
