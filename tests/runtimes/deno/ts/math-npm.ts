// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as MathJS from "npm:mathjs@11.11.1";

interface LogInput {
  base: null | number;
  number: number;
}

export function log({ base, number }: LogInput): number {
  return MathJS.log(number, base ?? MathJS.e);
}
