// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
export { caller } from "./_import.ts";

export function mapValues<
  O extends Record<string | number | symbol, unknown>,
  T,
>(
  object: O,
  fn: (value: O[keyof O], key: keyof O, object: O) => T,
): Record<keyof O, T> {
  const newEntries = Object.entries(object).map(([k, v]) => [
    k,
    fn(v as O[keyof O], k, object),
  ]);
  return Object.fromEntries(newEntries);
}

/** get the directory name from a path */
export function dirname(path: string): string {
  // Note: Do not refactor with runtime dependent OS check
  const [unixIdx, winIdx] = ["/", "\\"].map((sep) => path.lastIndexOf(sep));
  return path.substring((winIdx > 0 ? winIdx : unixIdx) + 1);
}

import { fromFileUrlPosix, fromFileUrlWin32 } from "./_import.ts";

/** get path from file url */
export function fromFileUrl(path: string): string {
  // Note: Do not refactor with runtime dependent OS check
  // Examples: file://C:, file://D:
  const isWin32 = /^file:\/\/\w:/.test(path);
  return isWin32 ? fromFileUrlWin32(path) : fromFileUrlPosix(path);
}
