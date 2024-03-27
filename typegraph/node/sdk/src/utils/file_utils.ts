// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { wit_utils } from "../wit.js";
import * as path from "node:path";

export async function getFileHash(filePath: string): Promise<string> {
  const cwd = wit_utils.getCwd();
  filePath = `${cwd}/${filePath}`;
  const hash = crypto.createHash("sha256");
  let file;

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    file = await fs.promises.open(filePath, "r");

    const CHUNK_SIZE = 4096;
    let buffer = new Uint8Array(CHUNK_SIZE);
    let bytesRead = 0;
    let numBytesRead = 0;
    do {
      const { bytesRead: numBytesRead } = await file.read(
        buffer,
        0,
        CHUNK_SIZE,
        bytesRead,
      );
      bytesRead += numBytesRead;
      hash.update(buffer.subarray(0, numBytesRead));
    } while (numBytesRead > 0);

    return hash.digest("hex");
  } catch (err) {
    throw new Error(`Failed to calculate hash for ${filePath}: \n${err}`);
  } finally {
    if (file !== undefined) {
      await file.close(); // Ensure file closure
    }
  }
}

export function getParentDirectories(filePath: string) {
  const directories = [];
  let currentDir = path.dirname(filePath);
  while (currentDir !== path.dirname(currentDir)) {
    directories.push(path.basename(currentDir));
    currentDir = path.dirname(currentDir);
  }
  return directories.reverse();
}

export function getRelativePath(
  moduleParentDirs: string[],
  depParentDirs: string[],
): string[] {
  let common = 0;
  let maxLength = Math.min(moduleParentDirs.length, depParentDirs.length);

  for (let i = 0; i < maxLength; i++) {
    if (moduleParentDirs[i] === depParentDirs[i]) {
      common += 1;
    } else {
      break;
    }
  }

  return depParentDirs.slice(common);
}
