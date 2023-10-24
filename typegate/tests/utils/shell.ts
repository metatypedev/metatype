// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "@test-utils/dir.ts";

export interface ShellOptions {
  stdin?: string;
  currentDir?: string;
  env?: Record<string, string>;
}

export interface ShellOutput {
  stdout: string;
  stderr: string;
}

export async function shell(
  cmd: string[],
  options: ShellOptions = {},
): Promise<ShellOutput> {
  const { stdin = null, env = {}, currentDir = null } = options;
  console.log(cmd);
  const p = new Deno.Command(cmd[0], {
    cwd: currentDir ?? testDir,
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
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

  console.log(">> end");

  let stdout = "";
  for await (const l of p.stdout.pipeThrough(new TextDecoderStream())) {
    stdout += l;
  }

  let stderr = "";
  for await (const l of p.stderr.pipeThrough(new TextDecoderStream())) {
    stderr += l;
  }

  const { code, success } = await p.status;

  if (!success) {
    const err = `-- start STDERR --\n${stderr}\n-- end STDERR --`;
    throw new Error(`Command "${cmd.join(" ")}" failed with ${code}:\n${err}`);
  }

  return { stdout, stderr };
}
