// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as fs from "node:fs";

export default function (path: string): Uint8Array {
  try {
    const buffer = fs.readFileSync(path, null);
    return new Uint8Array(buffer);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
