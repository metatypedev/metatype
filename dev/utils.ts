// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, resolve, yaml } from "./deps.ts";

export const projectDir = resolve(
  dirname(fromFileUrl(import.meta.url)),
  "..",
);

export async function runOrExit(
  cmd: string[],
  cwd?: string,
  env: Record<string, string> = {},
) {
  const p = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd,
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

export type Cursor = {
  start: number;
  end: number;
  length: number;
  match: string;
};

export function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

export function camelCase(str: string) {
  return str
    .split(/_+/g)
    .map((chunk, idx) => idx > 0 ? upperFirst(chunk) : chunk)
    .join("");
}

/**
 * Enhanced `indexOf` with regex support and position information
 */
export function nextMatch(
  text: string,
  word: string | RegExp,
  pos = 0,
): Cursor | null {
  if (word instanceof RegExp) {
    const searchPos = Math.min(text.length, pos);
    const nextText = text.substring(searchPos);
    const res = word.exec(nextText);
    word.lastIndex = 0; // always reset (js!)
    return res
      ? {
        match: res[0],
        start: searchPos + res.index,
        end: searchPos + res.index + res[0].length - 1,
        length: res[0].length,
      }
      : null;
  }
  const start = text.indexOf(word, pos);
  return start >= 0
    ? {
      start,
      end: start + word.length - 1,
      match: word,
      length: word.length,
    }
    : null;
}

/**
 * Determine all indexOf with position information
 */
export function findCursors(
  text: string,
  word: string | RegExp,
): Array<Cursor> {
  const matches = [] as Array<Cursor>;

  let cursor = 0;
  while (true) {
    const res = nextMatch(text, word, cursor);
    if (res != null) {
      cursor = res.end;
      matches.push(res);
    } else {
      break;
    }
  }

  return matches;
}
