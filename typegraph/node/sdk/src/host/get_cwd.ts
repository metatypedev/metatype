// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import * as process from "node:process";

export default function (): string {
  try {
    return process.cwd();
  } catch (err) {
    throw (err instanceof Error ? err.message : err);
  }
}
