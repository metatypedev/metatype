// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, resolve } from "std/path/mod.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

export async function init_runtimes(): Promise<void> {
  for await (const file of Deno.readDir(localDir)) {
    if (file.isFile && file.name.endsWith(".ts") && file.name !== "mod.ts") {
      await import(resolve(localDir, file.name));
    }
  }
}
