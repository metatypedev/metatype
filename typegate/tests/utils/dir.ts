// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, join } from "std/path/mod.ts";

export const testDir = dirname(dirname(fromFileUrl(import.meta.url)));
export const workspaceDir = dirname(dirname(testDir));

export function newTempDir(): Promise<string> {
  return Deno.makeTempDir({
    dir: join(dirname(dirname(testDir)), "tmp"),
  });
}
