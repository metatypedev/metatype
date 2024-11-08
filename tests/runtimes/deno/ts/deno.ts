// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

let count = 0;

export function counter(): number {
  return ++count;
}

export function sum({ numbers }: { numbers: number[] }): number {
  return numbers.reduce((a, b) => a + b, 0);
}
