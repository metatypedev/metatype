// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { FloatNode, IntegerNode } from "../../../typegraph/types.ts";
import { check } from "./common.ts";
import {
  ConstraintSpec,
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
      `typeof ${varName} === "number && !isNan(${varName})"`,
      `"Expected number at ${path}"`,
    ),
    ...generateConstraintValidatorsFor(numberConstraints, typeNode),
  ];
}
