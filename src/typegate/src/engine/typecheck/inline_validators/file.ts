// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { FileNode } from "../../../typegraph/types.ts";
import { check } from "./common.ts";
import {
  type ConstraintSpec,
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
