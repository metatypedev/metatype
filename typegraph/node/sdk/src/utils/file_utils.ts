// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { wit_utils } from "../wit.js";

export function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const currDir = wit_utils.getCwd();
    filePath = `${currDir}/${filePath}`;
    const hash = crypto.createHash("sha256");
    const fileDescriptor = fs.openSync(filePath, "r");

    const CHUNK_SIZE = 4096;
    let buffer = new Uint8Array(CHUNK_SIZE);
    let bytesRead = 0;

    function readChunk() {
      fs.read(
        fileDescriptor,
        buffer,
        0,
        CHUNK_SIZE,
        bytesRead,
        (err, numBytesRead) => {
          if (err) {
            fs.closeSync(fileDescriptor);
            reject(err);
            return;
          }

          if (numBytesRead === 0) {
            fs.closeSync(fileDescriptor);
            resolve(hash.digest("hex"));
            return;
          }

          bytesRead += numBytesRead;
          hash.update(buffer.subarray(0, numBytesRead));
          readChunk();
        },
      );
    }

    readChunk();
  });
}
