// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ListNode } from "../../../typegraph/type_node.ts";
import { check } from "./common.ts";
import {
  ConstraintSpec,
  generateConstraintValidatorsFor,
} from "./constraints.ts";

const arrayConstraints = [
  {
    name: "minItems",
    test: (ref, c) => `${ref}.length < ${c}`,
    description: "minimum items",
  },
  {
    name: "maxItems",
    test: (ref, c) => `${ref}.length > ${c}`,
    description: "maximum items",
  },
] as const satisfies ConstraintSpec[];

export function generateListValidator(
  typeNode: ListNode,
  varName: string,
  path: string,
): string[] {
  return [
    check(`Array.isArray(${varName})`, `"Expected array at ${path}"`),
    ...generateConstraintValidatorsFor(arrayConstraints, typeNode),
  ];
}
