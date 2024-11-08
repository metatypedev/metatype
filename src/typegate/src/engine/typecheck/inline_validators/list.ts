// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ListNode } from "../../../typegraph/type_node.ts";
import { check } from "./common.ts";
import {
  type ConstraintSpec,
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
