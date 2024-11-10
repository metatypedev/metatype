// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export function check(condition: string, message: string) {
  return `if (!(${condition})) throw new Error(${message});`;
}
