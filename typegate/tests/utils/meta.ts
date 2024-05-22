// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { shell, ShellOptions, ShellOutput } from "test-utils/shell.ts";

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
