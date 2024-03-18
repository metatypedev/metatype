// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as path from "node:path";

export function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const currDir = path.dirname(path.resolve(process.argv[1]));
    filePath = `${currDir}/${filePath}`;
    const hash = crypto.createHash("sha256");
    const fileDescriptor = fs.openSync(filePath, "r");

    const CHUNK_SIZE = 4096;
    let buffer = Buffer.alloc(CHUNK_SIZE);
    let bytesRead = 0;

    function readChunk() {
      fs.read(
        fileDescriptor,
        buffer,
        0,
        CHUNK_SIZE,
        bytesRead,
        (err, bytesRead) => {
          if (err) {
            fs.closeSync(fileDescriptor);
            reject(err);
            return;
          }

          if (bytesRead === 0) {
            fs.closeSync(fileDescriptor);
            resolve(hash.digest("hex"));
            return;
          }

          hash.update(buffer.subarray(0, bytesRead));
          readChunk();
        },
      );
    }

    readChunk();
    return hash;
  });
}
