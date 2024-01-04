// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "test-utils/dir.ts";
import { shell, ShellOptions, ShellOutput } from "test-utils/shell.ts";
import { resolve } from "std/path/mod.ts";

let compiled = false;

export async function metaCli(...args: string[]): Promise<ShellOutput>;
export async function metaCli(
  options: ShellOptions,
  ...args: string[]
): Promise<ShellOutput>;
export async function metaCli(
  first: string | ShellOptions,
  ...input: string[]
): Promise<ShellOutput> {
  const metaCliExe = await getMetaCliExe();

  const res =
    await (typeof first === "string"
      ? shell([metaCliExe, first, ...input])
      : shell([metaCliExe, ...input], first));

  return res;
}

type MetaCli = (args: string[], options?: ShellOptions) => Promise<ShellOutput>;

export async function getMetaCliExe(): Promise<string> {
  if (!compiled) {
    await shell(["cargo", "build", "--package", "meta-cli"]);
    compiled = true;
  }
  const metaCliExe = resolve(testDir, "../../target/debug/meta");
  return metaCliExe;
}

export async function createMetaCli(
  shell: (args: string[], options?: ShellOptions) => Promise<ShellOutput>,
): Promise<MetaCli> {
  const metaCliExe = await getMetaCliExe();
  return (args, options) => {
    console.log({ options });
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
  const cmd = ["cargo", "run", "-p", "meta-cli", "--", "serialize", "-f", tg];
  if (options.unique) {
    cmd.push("-1");
  }
  if (options.typegraph) {
    cmd.push("-t", options.typegraph);
  }

  const res = await shell(cmd);
  return res.stdout;
}
