// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { BooleanNode } from "../../../typegraph/types.ts";
import { check } from "./common.ts";

export function generateBooleanValidator(
  _typeNode: BooleanNode,
  varName: string,
  path: string,
): string[] {
  return [
    check(`typeof ${varName} === "boolean"`, `Expected boolean at ${path}`),
  ];
}
