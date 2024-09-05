// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { StringNode } from "../../../typegraph/type_node.ts";
import { check } from "./common.ts";
import {
  type ConstraintSpec,
  generateConstraintValidatorsFor,
} from "./constraints.ts";

const stringLengthConstraints = [
  {
    name: "minLength",
    test: (ref, p) => `(${ref}).length < ${p}`,
    description: "minimum length",
  },
  {
    name: "maxLength",
    test: (ref, p) => `(${ref}).length > ${p}`,
    description: "maximum length",
  },
  {
    name: "pattern",
    test: (ref, p) => `new RegExp(${JSON.stringify(p)}).test(${ref})`,
  },
] as const satisfies ConstraintSpec[];

export function generateStringValidator(
  typeNode: StringNode,
  varName: string,
  path: string,
): string[] {
  const res = [
    check(`typeof ${varName} === "string"`, `"Expected string at ${path}"`),
    ...generateConstraintValidatorsFor(stringLengthConstraints, typeNode),
  ];

  if (typeNode.format != null) {
    const format = JSON.stringify(typeNode.format);
    const validatorName = `${varName}_checkFormat`;
    res.push(
      `const ${validatorName} = context.formatValidators[${format}];`,
      check(
        `${varName} != null`,
        `'Unknown format: ${typeNode.format}'`,
      ),
      check(
        `${validatorName}(${varName})`,
        `\`At "${path}": expected to match format: ${format}, got \${${varName}}\``,
      ),
    );
  }

  return res;
}
