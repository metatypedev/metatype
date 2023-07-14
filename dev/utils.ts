// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, resolve, yaml } from "./deps.ts";

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

interface Lockfile {
  [channel: string]: {
    files: Record<string, string[]>;
    lines: Record<string, Record<string, string>>;
    lock: Record<string, string>;
  };
}

export const lockfileUrl = resolve(projectDir, "dev/lock.yml");

export async function getLockfile() {
  const file = await Deno.readTextFile(lockfileUrl);
  return yaml.parse(
    file,
  ) as Lockfile;
}
