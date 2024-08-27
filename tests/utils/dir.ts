// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, join } from "@std/path";

export const testDir = dirname(dirname(fromFileUrl(import.meta.url)));
export const workspaceDir = dirname(testDir);
let tmpdir = Deno.env.get("TMPDIR");
if (!tmpdir) {
  console.error(
    "ERROR: unable to determine system tmp dir from TMPDIR. Defaulting to /tmp",
  );
  tmpdir = "/tmp";
}
tmpdir = join(tmpdir!, "metatest");
await Deno.mkdir(tmpdir, { recursive: true });

export function newTempDir(
  options: Deno.MakeTempOptions = {},
): Promise<string> {
  return Deno.makeTempDir({
    dir: tmpdir,
    ...options,
  });
}
