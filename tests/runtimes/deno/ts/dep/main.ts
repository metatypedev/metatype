// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { add } from "./nested/dep.ts";

interface AddInput {
  a: number;
  b: number;
}
export function doAddition({ a, b }: AddInput) {
  return add(a, b);
}
