// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as MathLib from "https://deno.land/x/math@v1.1.0/mod.ts";

interface MinInput {
  numbers: Array<number>;
}

export function min({ numbers }: MinInput): number {
  return Number(MathLib.min(numbers));
}
