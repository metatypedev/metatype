// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { $ } from "@david/dax";
import { killProcess, Lines } from "./process.ts";
import type { MetaTest } from "./test.ts";
import { shell, type ShellOptions, type ShellOutput } from "./shell.ts";

// added to path in dev/test.ts
const metaCliExe = "meta";

export async function metaCli(...args: string[]): Promise<ShellOutput>;
export async function metaCli(
  options: ShellOptions,
  ...args: string[]
): Promise<ShellOutput>;
export async function metaCli(
  first: string | ShellOptions,
  ...input: string[]
): Promise<ShellOutput> {
  const res =
    await (typeof first === "string"
      ? shell([metaCliExe, first, ...input])
      : shell([metaCliExe, ...input], first));

  return res;
}

type MetaCli = (args: string[], options?: ShellOptions) => Promise<ShellOutput>;

export function createMetaCli(
  shell: (args: string[], options?: ShellOptions) => Promise<ShellOutput>,
): MetaCli {
  return (args, options) => {
    return shell([metaCliExe, ...args], options);
  };
}

export interface SerializeOptions {
  unique?: boolean;
  typegraph?: string;
}

export async function serialize(
  tg: string,
  options: SerializeOptions = {},
): Promise<string> {
  const cmd = [metaCliExe, "serialize", "-f", tg];
  if (options.unique) {
    cmd.push("-1");
  }
  if (options.typegraph) {
    cmd.push("-t", options.typegraph);
  }

  const res = await shell(cmd);
  return res.stdout;
}

export function makeMetaCliTest(t: MetaTest, cwd: string, args: string[]) {
  console.log({
    cwd,
    args,
  });
  const meta = new Deno.Command("meta", {
    cwd,
    args,
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const stdout = new Lines(meta.stdout);
  const stderr = new Lines(meta.stderr);

  const expectStdout = async (str: string) => {
    await stdout.readWhile((line) => !$.stripAnsi(line).includes(str));
  };

  const expectStderr = async (str: string) => {
    await stderr.readWhile((line) => !$.stripAnsi(line).includes(str));
  };

  t.addCleanup(async () => {
    await stdout.close();
    await stderr.close();
    await killProcess(meta);
  });

  return { meta, stdout, stderr, expectStdout, expectStderr };
}
