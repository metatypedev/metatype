// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "./dir.ts";
import { shell, ShellOptions } from "./shell.ts";
import { resolve } from "std/path/mod.ts";

const metaCli = resolve(testDir, "../../target/debug/meta");
let compiled = false;

export async function meta(...args: string[]): Promise<string>;
export async function meta(
  options: ShellOptions,
  ...args: string[]
): Promise<string>;
export async function meta(
  first: string | ShellOptions,
  ...input: string[]
): Promise<string> {
  if (!compiled) {
    await shell(["cargo", "build", "--package", "meta-cli"]);
    compiled = true;
  }

  const res =
    await (typeof first === "string"
      ? shell([metaCli, first, ...input])
      : shell([metaCli, ...input], first));

  return res;
}

export interface SerializeOptions {
  unique?: boolean;
  typegraph?: string;
}

export function serialize(
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

  return shell(cmd);
}
