// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "@test-utils/dir.ts";

export interface ShellOptions {
  stdin?: string;
  currentDir?: string;
  env?: Record<string, string>;
}

export async function shell(
  cmd: string[],
  options: ShellOptions = {},
): Promise<string> {
  const { stdin = null, env = {}, currentDir = null } = options;
  console.log(cmd);
  const p = new Deno.Command(cmd[0], {
    cwd: currentDir ?? testDir,
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "inherit",
    stdin: "piped",
    env,
  }).spawn();

  if (stdin != null) {
    const w = p.stdin.getWriter();
    w.write(new TextEncoder().encode(stdin));
    await w.close();
  } else {
    p.stdin.close();
  }

  let out = "";
  for await (const l of p.stdout.pipeThrough(new TextDecoderStream())) {
    out += l;
  }

  const { code, success } = await p.status;

  if (!success) {
    throw new Error(`Command "${cmd.join(" ")}" failed with ${code}: "${out}"`);
  }

  return out;
}
