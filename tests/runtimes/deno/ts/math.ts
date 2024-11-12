// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// deno-lint-ignore no-external-import
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
