// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as fs from "node:fs";

export default function (path: string, data: Uint8Array): void {
  try {
    void fs.writeFileSync(path, data);
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
