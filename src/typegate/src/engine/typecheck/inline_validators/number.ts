// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { FloatNode, IntegerNode } from "../../../typegraph/types.ts";
import { check } from "./common.ts";
import {
  type ConstraintSpec,
  generateConstraintValidatorsFor,
} from "./constraints.ts";

const numberConstraints = [
  { name: "minimum", test: "<" },
  { name: "maximum", test: ">" },
  { name: "exclusiveMinimum", test: "<=", description: "exclusive minimum" },
  { name: "exclusiveMaximum", test: ">=", description: "exclusive maximum" },
] as const satisfies ConstraintSpec[];

export function generateNumberValidator(
  typeNode: IntegerNode | FloatNode,
  varName: string,
  path: string,
): string[] {
  return [
    check(
      `typeof ${varName} === "number" && !isNaN(${varName})`,
      `"Expected number at '${path}'"`,
    ),
    ...generateConstraintValidatorsFor(numberConstraints, typeNode),
  ];
}
