// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

let count = 0;

export function counter(): number {
  //console.log("counter", { count });
  return ++count;
}

export function sum({ numbers }: { numbers: number[] }): number {
  return numbers.reduce((a, b) => a + b, 0);
}
