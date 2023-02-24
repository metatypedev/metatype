// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

let count = 0;

export function counter(): number {
  //console.log("counter", { count });
  return ++count;
}

export function sum({ numbers }: { numbers: number[] }): number {
  return numbers.reduce((a, b) => a + b, 0);
}
