// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { fromFileUrl, join } from "@std/path";

export const testDir = fromFileUrl(import.meta.resolve("../"));
export const workspaceDir = fromFileUrl(import.meta.resolve("../../"));

export function newTempDir(
  options: Deno.MakeTempOptions = {},
): Promise<string> {
  return Deno.makeTempDir({
    dir: join(workspaceDir, "tmp"),
    ...options,
  });
}
