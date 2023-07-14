// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph } from "../typegraph.ts";
import { CodeGenerator } from "./code_generator.ts";
import { mapValues } from "std/collections/map_values.ts";
import {
  ErrorEntry,
  validationContext,
  Validator,
  ValidatorFn,
} from "./common.ts";

export function generateValidator(tg: TypeGraph, typeIdx: number): Validator {
  const validator = new Function(
    new InputValidationCompiler(tg).generate(typeIdx),
  )() as ValidatorFn;
  return (value: unknown) => {
    const errors: ErrorEntry[] = [];
    validator(value, "<value>", errors, validationContext);
    if (errors.length > 0) {
      const messages = errors.map(([path, msg]) => `  - at ${path}: ${msg}\n`)
        .join("");
      throw new Error(`Validation errors:\n${messages}`);
    }
  };
}

function functionName(typeIdx: number) {
  return `validate_${typeIdx}`;
}

export class InputValidationCompiler {
  codes: Map<number, string> = new Map();

  constructor(private tg: TypeGraph) {}

  generate(rootTypeIdx: number): string {
    const cg = new CodeGenerator();
    const queue = [rootTypeIdx];
    const refs = new Set([rootTypeIdx]);
    for (
      let typeIdx = queue.shift();
      typeIdx != null;
      typeIdx = queue.shift()
    ) {
      refs.add(typeIdx);
      if (this.codes.has(typeIdx)) {
        continue;
      }
      const typeNode = this.tg.type(typeIdx);

      if (typeNode.enum != null) {
        cg.generateEnumValidator(typeNode);
      } else {
        switch (typeNode.type) {
          case "boolean":
            cg.generateBooleanValidator(typeNode);
            break;
          case "number":
          case "integer":
            cg.generateNumberValidator(typeNode);
            break;
          case "string":
            cg.generateStringValidator(typeNode);
            break;
          case "file":
            cg.generateFileValidator(typeNode);
            break;
          case "optional":
            cg.generateOptionalValidator(typeNode, functionName(typeNode.item));
            queue.push(typeNode.item);
            break;
          case "array":
            cg.generateArrayValidator(typeNode, functionName(typeNode.items));
            queue.push(typeNode.items);
            break;
          case "object":
            cg.generateObjectValidator(
              typeNode,
              mapValues(typeNode.properties, functionName),
            );
            queue.push(...Object.values(typeNode.properties));
            break;
          case "union":
            cg.generateUnionValidator(
              typeNode,
              typeNode.anyOf.map(functionName),
            );
            queue.push(...typeNode.anyOf);
            break;
          case "either":
            cg.generateEitherValidator(
              typeNode,
              typeNode.oneOf.map(functionName),
            );
            queue.push(...typeNode.oneOf);
            break;
          default:
            throw new Error(`Unsupported type: ${typeNode.type}`);
        }
      }

      const fnName = functionName(typeIdx);
      const fnBody = cg.reset().join("\n");
      this.codes.set(
        typeIdx,
        `function ${fnName}(value, path, errors, context) {\n${fnBody}\n}`,
      );
    }

    const rootValidatorName = functionName(rootTypeIdx);
    const rootValidator = `\nreturn ${rootValidatorName}`;

    return [...refs].map((idx) => this.codes.get(idx))
      .join("\n") + rootValidator;
  }
}
