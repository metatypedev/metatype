// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as MathLib from "https://deno.land/x/math@v1.1.0/mod.ts";

interface MinInput {
  numbers: Array<number>;
}

export function min({ numbers }: MinInput): number {
  return Number(MathLib.min(numbers));
}

export function maxAsync({ numbers }: MinInput): Promise<number> {
  return Promise.resolve(Number(MathLib.max(numbers)));
}
