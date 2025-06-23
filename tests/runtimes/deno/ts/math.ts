// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// Modified from https://github.com/axetroy/deno_math/blob/1597f1872f975d099f079ec9a71d9408dd2b8b72/

// deno-lint-ignore no-external-import
import Big from "npm:big.js@6.2.2";

interface MinInput {
  numbers: Array<number>;
}

export function min({ numbers: values }: MinInput): number {
  let minValue = new Big(values[0]);
  for (const value of values) {
    if ((new Big(value)).lt(minValue)) {
      minValue = new Big(value);
    }
  }
  return Number(minValue);
}

export function maxAsync({ numbers: values }: MinInput): Promise<number> {
  let maxValue = new Big(values[0]);
  for (const value of values) {
    if ((new Big(value)).gt(maxValue)) {
      maxValue = new Big(value);
    }
  }
  return Promise.resolve(Number(maxValue));
}
