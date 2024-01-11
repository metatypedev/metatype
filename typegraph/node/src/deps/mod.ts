// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
export { caller } from "./_import.js";

export function mapValues(
  object: Object,
  fn: (value: any, key: string, object: Object) => any,
) {
  const newEntries = Object
    .entries(object)
    .map(([k, v]) => [k, fn(v, k, object)]);
  return Object.fromEntries(newEntries);
}

export function dirname(path: string) {
  // Note: Do not refactor with runtime dependent OS check
  const [unixIdx, winIdx] = ["/", "\\"].map((sep) => path.lastIndexOf(sep));
  return path.substring((winIdx > 0 ? winIdx : unixIdx) + 1);
}

import { fromFileUrlPosix, fromFileUrlWin32 } from "./_import.js";

export function fromFileUrl(path: string) {
  // Note: Do not refactor with runtime dependent OS check
  // Examples: file://C:, file://D:
  const isWin32 = /^file:\/\/\w\:/.test(path);
  return isWin32 ? fromFileUrlWin32(path) : fromFileUrlPosix(path);
}
