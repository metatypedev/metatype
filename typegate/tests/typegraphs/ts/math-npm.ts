// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as MathJS from "npm:mathjs";

interface LogInput {
  base: null | number;
  number: number;
}

export function log({ base, number }: LogInput): number {
  return MathJS.log(number, base ?? MathJS.e);
}
