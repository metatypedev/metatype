// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// deno-lint-ignore no-external-import
import * as MathJS from "npm:mathjs@11.11.1";

interface LogInput {
  base: null | number;
  number: number;
}

export function log({ base, number }: LogInput): number {
  return MathJS.log(number, base ?? MathJS.e);
}
