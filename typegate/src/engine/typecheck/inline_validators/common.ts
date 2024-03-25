// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export function check(condition: string, message: string) {
  return `if (!(${condition})) throw new Error(${message});`;
}
