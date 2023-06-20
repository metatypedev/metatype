// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export {
  basename,
  dirname,
  resolve,
} from "https://deno.land/std@0.192.0/path/mod.ts";
export { parse as parseFlags } from "https://deno.land/std@0.192.0/flags/mod.ts";
export { expandGlobSync } from "https://deno.land/std@0.192.0/fs/mod.ts";
export {
  mergeReadableStreams,
  TextLineStream,
} from "https://deno.land/std@0.192.0/streams/mod.ts";
export { groupBy } from "https://deno.land/std@0.192.0/collections/group_by.ts";
export type { WalkEntry } from "https://deno.land/std@0.192.0/fs/mod.ts";
export * as yaml from "https://deno.land/std@0.192.0/yaml/mod.ts";
export * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";
export { udd } from "https://deno.land/x/udd@0.8.2/mod.ts";

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.192.0/path/mod.ts";

export const projectDir = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "..",
);

export async function runOrExit(
  cmd: string[],
  cwd: string = Deno.cwd(),
  env: Record<string, string> = {},
) {
  const p = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd: cwd,
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), ...env },
  }).spawn();

  // keep pipe asynchronous till the command exists
  void p.stdout.pipeTo(Deno.stdout.writable, { preventClose: true });
  void p.stderr.pipeTo(Deno.stderr.writable, { preventClose: true });

  const { code, success } = await p.status;
  if (!success) {
    Deno.exit(code);
  }
}

export function relPath(path: string) {
  let clean = path.replace(projectDir, "");
  if (clean.startsWith("/")) {
    clean = clean.slice(1);
  }
  return clean;
}
