// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { copySync, dirname, fromFileUrl, join, resolve } from "./deps.ts";

export const projectDir = resolve(dirname(fromFileUrl(import.meta.url)), "..");

export async function runOrExit(
  cmd: string[],
  cwd?: string,
  env: Record<string, string> = {},
) {
  console.error("shell: ", cmd.join(" "), { env, cwd });
  const p = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd,
    // stdout: "piped",
    // stderr: "piped",
    env: { ...Deno.env.toObject(), ...env },
  }).spawn();

  // await p.stdout.pipeTo(Deno.stdout.writable, { preventClose: true });
  // await p.stderr.pipeTo(Deno.stderr.writable, { preventClose: true });

  const { code, success } = await p.status;
  if (!success) {
    Deno.exit(code);
  }
}

interface Lockfile {
  [channel: string]: {
    files: Record<string, string[]>;
    lines: Record<string, Record<string, string>>;
    lock: Record<string, string>;
  };
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
    .map((chunk, idx) => (idx > 0 ? upperFirst(chunk) : chunk))
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

/** Remove extension, will treat `.d.ts` as a whole */
export function removeExtension(path: string) {
  const known = /(\.d\.m?ts)$/;
  const match = path.trim().match(known);
  return match
    ? path.replace(match[0], "")
    : path.substring(0, path.lastIndexOf("."));
}

export function copyFilesAt(
  { destDir, overwrite }: { destDir: string; overwrite?: boolean },
  fileNames: Record<string, string>,
) {
  for (const [orig, destName] of Object.entries(fileNames)) {
    console.log("from", orig, "to", join(destDir, destName));
    copySync(orig, join(destDir, destName), { overwrite });
  }
}
