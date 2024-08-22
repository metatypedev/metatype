// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeNode } from "../../../typegraph/type_node.ts";
import { check } from "./common.ts";

// binary operator or function
export type ConstraintTest =
  | string
  | ((ref: string, constraintValue: unknown) => string);

export type ConstraintSpec<N extends string = string> = {
  name: N;
  test: ConstraintTest;
  description?: string;
};

export type ConstraintList<N extends string> = ConstraintSpec<N>[];

export function getConstraintTest(op: string) {
  return (ref: string, constraintValue: unknown) =>
    `${ref} ${op} ${JSON.stringify(constraintValue)}`;
}

export function generateConstraintValidator(
  constraint: ConstraintSpec,
  constraintValue: unknown,
  ref: string,
  path: string,
) {
  const { name, test, description } = constraint;
  const c = description ?? name;
  const testFn = typeof test === "string" ? getConstraintTest(test) : test;
  const condition = testFn(ref, constraintValue);
  const expected = JSON.stringify(constraintValue);
  return check(
    condition,
    `\`At "${path}", expected ${c}: ${expected}; got \${${ref}}\``,
  );
}

type ValidNode<L> = L extends ConstraintList<infer N>
  ? TypeNode & Partial<Record<N, unknown>>
  : never;

export function generateConstraintValidatorsFor<
  N extends string,
  L = ConstraintList<N>,
>(
  constraints: ConstraintList<N>,
  typeNode: ValidNode<L>,
): string[] {
  const res: string[] = [];
  for (const c of constraints) {
    const constraintValue = typeNode[c.name];
    if (constraintValue != null) {
      res.push(generateConstraintValidator(c, constraintValue, "value", ""));
    }
  }
  return res;
}
