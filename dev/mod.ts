// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

export {
  basename,
  dirname,
  resolve,
} from "https://deno.land/std@0.170.0/path/mod.ts";
export { parse as parseFlags } from "https://deno.land/std@0.170.0/flags/mod.ts";
export { expandGlobSync } from "https://deno.land/std@0.170.0/fs/mod.ts";
export type { WalkEntry } from "https://deno.land/std@0.170.0/fs/mod.ts";
export * as yaml from "https://deno.land/std@0.170.0/encoding/yaml.ts";
export * as semver from "https://deno.land/x/semver/mod.ts";

import {
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.170.0/path/mod.ts";

export const projectDir = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "..",
);

export async function run(
  cmd: string[],
  cwd: string = Deno.cwd(),
  env: Record<string, string> = Deno.env.toObject(),
) {
  const p = Deno.run({
    cmd,
    cwd: cwd,
    env,
  });

  return await p.status();
}

export async function runOrExit(
  cmd: string[],
  cwd: string = Deno.cwd(),
  env: Record<string, string> = Deno.env.toObject(),
) {
  const p = Deno.run({
    cmd,
    cwd: cwd,
    env,
  });

  const status = await p.status();

  if (!status.success) {
    Deno.exit(status.code);
  }
}
