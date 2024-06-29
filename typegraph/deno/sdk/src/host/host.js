// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

function listAllFilesHelper(
  root,
  list,
  exclude,
) {
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

export function expandPath(
  root,
  exclude,
) {
  try {
    const ret = [];
    listAllFilesHelper(root, ret, exclude);
    return ret;
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function print(msg) {
  console.log(msg);
}

export function eprint(msg) {
  console.error(msg);
}

export function getCwd() {
  try {
    return process.cwd();
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function readFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath, null);
    return new Uint8Array(buffer);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}

export function writeFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    void fs.writeFileSync(filePath, data, { flag: "w" });
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
