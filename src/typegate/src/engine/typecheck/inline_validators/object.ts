// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  type ObjectNode,
  Type,
  type TypeNode,
} from "../../../typegraph/type_node.ts";
import { check } from "./common.ts";

export function generateObjectValidator(
  typeNode: ObjectNode,
  varName: string,
  path: string,
  keys: {
    required: string[];
    optional: string[];
  },
): string[] {
  const varRequired = `${varName}_required`;
  const varOptional = `${varName}_optional`;
  const varKeys = `${varName}_keys`;

  return [
    check(`typeof ${varName} === "object"`, `"Expected object at ${path}"`),
    check(`${varName} != null`, `"Expected a non-null object at ${path}"`),
    `const ${varRequired} = new Set(${JSON.stringify(keys.required)});`,
    `const ${varOptional} = new Set(${JSON.stringify(keys.optional)});`,
    `const ${varKeys} = Object.keys(${varName});`,
    `for (const key of ${varKeys}) {`,
    `  if (${varRequired}.has(key)) { ${varRequired}.delete(key); continue; }`,
    `  if (${varOptional}.has(key)) { ${varOptional}.delete(key); continue; }`,
    `  if (${typeNode.additionalProps}) { continue; }`,
    `  throw new Error(\`At "${path}": unexpected key: \${key}\`);`,
    `}`,
    check(
      `${varRequired}.size === 0`,
      `\`At "${path}": missing required keys: \${Array.from(${varRequired})}\``,
    ),
  ];
}

// TODO move
export function getKeys(
  typeNode: ObjectNode,
  resolve: (idx: number) => TypeNode,
) {
  const required: string[] = [];
  const optional: string[] = [];

  for (const [key, propIdx] of Object.entries(typeNode.properties)) {
    const typeNode = resolve(propIdx);
    if (typeNode.type === Type.OPTIONAL) {
      optional.push(key);
    } else {
      required.push(key);
    }
  }

  return { required, optional };
}
