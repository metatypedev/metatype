// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

function listAllFilesHelper(
  root: string,
  list: Array<string>,
  exclude?: Array<string>,
): void {
  const currStat = fs.statSync(root);
  if (!currStat.isDirectory()) {
    list.push(root);
    return;
  }
  search: for (const filename of fs.readdirSync(root)) {
    const fullPath = path.join(root, filename);
    if (exclude) {
      for (const pattern of exclude) {
        const reg = new RegExp(pattern);
        if (reg.test(fullPath)) continue search;
      }
    }
    listAllFilesHelper(fullPath, list, exclude);
  }
}

export function expandGlob(
  root: string,
  exclude: Array<string>,
): Array<string> {
  try {
    const ret = [] as Array<string>;
    // console.log("[host] received args", root, exclude);
    listAllFilesHelper(root, ret, exclude);
    return ret;
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function print(msg: string) {
  console.log(msg);
}

export function getCwd(): string {
  try {
    return process.cwd();
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function fileExists(path: string): boolean {
  try {
    return fs.existsSync(path);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function readFile(path: string): Uint8Array {
  try {
    const buffer = fs.readFileSync(path, null);
    return new Uint8Array(buffer);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function writeFile(path: string, data: Uint8Array): void {
  try {
    void fs.writeFileSync(path, data);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
