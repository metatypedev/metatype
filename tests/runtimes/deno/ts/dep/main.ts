// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { add } from "./nested/dep.ts";

interface AddInput {
  a: number;
  b: number;
}
export function doAddition({ a, b }: AddInput) {
  return add(a, b);
}
