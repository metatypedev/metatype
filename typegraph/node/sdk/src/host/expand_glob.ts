// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as fs from "node:fs";
import * as path from "node:path";
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

export default function (root: string, exclude: Array<string>): Array<string> {
  try {
    const ret = [] as Array<string>;
    // console.log("[host] received args", root, exclude);
    listAllFilesHelper(root, ret, exclude);
    return ret;
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
