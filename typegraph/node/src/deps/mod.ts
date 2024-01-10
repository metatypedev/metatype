// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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
  const [unixIdx, winIdx] = ["/", "\\"].map((sep) => path.lastIndexOf(sep));
  if (unixIdx > 0) {
    return path.substring(unixIdx + 1);
  }
  if (winIdx > 0) {
    return path.substring(winIdx + 1);
  }
  return path;
}

export { default as caller } from "./caller.js";
export { default as fromFileUrl } from "./fromFileUrl.js";
