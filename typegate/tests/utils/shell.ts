// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "test-utils/dir.ts";

export interface ShellOptions {
  stdin?: string;
  currentDir?: string;
  env?: Record<string, string>;
}

export interface ShellOutput {
  stdout: string;
  stderr: string;
}

async function readOutput(p: Deno.ChildProcess): Promise<ShellOutput> {
  const [stdout, stderr] = await Promise.all([
    (async () => {
      let stdout = "";
      for await (const l of p.stdout.pipeThrough(new TextDecoderStream())) {
        stdout += l;
      }
      return stdout;
    })(),
    (async () => {
      let stderr = "";
      for await (const l of p.stderr.pipeThrough(new TextDecoderStream())) {
        stderr += l;
      }
      return stderr;
    })(),
  ]);
  return { stdout, stderr };
}

export async function shell(
  cmd: string[],
  options: ShellOptions = {},
): Promise<ShellOutput> {
  const { stdin = null, env = {}, currentDir = null } = options;
  console.log(
    "shell:",
    cmd.map((c) => `${JSON.stringify(c)}`).join(" "),
  );
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

  const res = await readOutput(p);

  const { code, success } = await p.status;

  if (!success) {
    const err = `-- start STDERR --\n${res.stderr}\n-- end STDERR --`;
    const command = cmd.map((s) => JSON.stringify(s)).join(" ");
    throw new Error(
      `Command '${command}' failed with ${code}:\n${err}`,
    );
  }

  return res;
}
