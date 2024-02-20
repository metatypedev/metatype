// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { FileNode } from "../../../typegraph/types.ts";
import { check } from "./common.ts";
import {
  ConstraintSpec,
  generateConstraintValidatorsFor,
} from "./constraints.ts";

const fileConstraints = [
  {
    name: "minSize",
    test: (ref, c) => `${ref}.size < ${c}`,
    description: "minimum size",
  },
  {
    name: "maxSize",
    test: (ref, c) => `${ref}.size > ${c}`,
    description: "maximum size",
  },
  {
    name: "mimeTypes",
    test: (ref, c) => `${JSON.stringify(c)}.includes(${ref}.type)`,
    description: "mime type",
  },
] as const satisfies ConstraintSpec[];

export function generateFileValidator(
  typeNode: FileNode,
  varName: string,
  path: string,
): string[] {
  return [
    check(`${varName} instanceof File`, `"At ${path}: expected File"`),
    ...generateConstraintValidatorsFor(fileConstraints, typeNode),
  ];
}
