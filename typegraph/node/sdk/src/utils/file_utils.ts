// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as fs from "fs";
import * as crypto from "crypto";

export function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
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
  });
}
