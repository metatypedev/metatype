// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export {
  basename,
  dirname,
  resolve,
} from "https://deno.land/std@0.184.0/path/mod.ts";
export { parse as parseFlags } from "https://deno.land/std@0.184.0/flags/mod.ts";
export { expandGlobSync } from "https://deno.land/std@0.184.0/fs/mod.ts";
export { groupBy } from "https://deno.land/std@0.184.0/collections/group_by.ts";
export type { WalkEntry } from "https://deno.land/std@0.184.0/fs/mod.ts";
export * as yaml from "https://deno.land/std@0.184.0/yaml/mod.ts";
export * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";
export { udd } from "https://deno.land/x/udd@0.8.2/mod.ts";

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.184.0/path/mod.ts";

export const projectDir = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "..",
);

export async function run(
  cmd: string[],
  cwd: string = Deno.cwd(),
  env: Record<string, string> = Deno.env.toObject(),
) {
  const p = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd: cwd,
    stdout: "piped",
    stderr: "piped",
    env,
  }).spawn();
  p.stdout.pipeTo(Deno.stdout.writable, { preventClose: true });
  p.stderr.pipeTo(Deno.stderr.writable, { preventClose: true });
  return await p.status;
}

export async function runOrExit(
  cmd: string[],
  cwd: string = Deno.cwd(),
  env: Record<string, string> = Deno.env.toObject(),
) {
  const { code, success } = await run(cmd, cwd, env);

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
