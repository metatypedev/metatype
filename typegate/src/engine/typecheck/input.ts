// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph } from "../../typegraph/mod.ts";
import { TypeNode } from "../../typegraph/types.ts";
import { CodeGenerator } from "./code_generator.ts";
import { mapValues } from "std/collections/map-values";
import {
  ErrorEntry,
  validationContext,
  Validator,
  ValidatorFn,
} from "./common.ts";

export function generateValidator(tg: TypeGraph, typeIdx: number): Validator {
  const validatorName = (typeIdx: number) => `validate_${typeIdx}`;
  const validatorCode = new InputValidationCompiler(tg, validatorName)
    .generate(typeIdx);

  const validator = new Function(validatorCode)() as ValidatorFn;
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

/**
 * Validate against fields/subfields that only appears on the refered type (if object)
 *
 * # Example:
 *
 * ## Typegraph
 * ```
 * A = t.struct({
 *  a: t.either([t.string(), t.integer()]),
 *  b: t.struct({ c: t.string(), d: t.integer().optional() }))
 *      .optional()
 * })
 * ```
 * ## Validation
 * ```
 * const validatorWeak = generateWeakValidator(tg, idxA);
 * validatorWeak({ a: 1, b: { c: "hello" } }); // ok
 * validatorWeak({ a: "one", b: { c: "hello", whatever: "world" } }); // ok
 * validatorWeak({ a: false, b: { c: "hello" } }); // fail
 * validatorWeak({ a: 1, whatever: 1234 }); // ok
 * validatorWeak({ whatever: 1234 }); // fail
 * ```
 */
export function generateWeakValidator(
  tg: TypeGraph,
  typeIdx: number,
): Validator {
  const validator = generateValidator(tg, typeIdx);
  const node = tg.type(typeIdx);
  switch (node.type) {
    case "object":
      return (value: unknown) => {
        const filtered = filterDeclaredFields(tg, value, node);
        validator(filtered);
      };
    case "optional":
      return generateWeakValidator(tg, node.item);
    default: {
      return validator;
    }
  }
}

function filterDeclaredFields(
  tg: TypeGraph,
  value: any,
  node: TypeNode,
): unknown {
  switch (node.type) {
    case "object": {
      const explicitlyDeclared = Object.entries(node.properties);
      const result = {} as Record<string, unknown>;
      for (const [field, idx] of explicitlyDeclared) {
        const nextNode = tg.type(idx);
        result[field] = filterDeclaredFields(
          tg,
          value?.[field],
          nextNode,
        );
      }
      return result;
    }
    case "optional":
      if (value === undefined || value === null) {
        return null;
      }
      return filterDeclaredFields(
        tg,
        value,
        tg.type(node.item),
      );
    default:
      return value;
  }
}

export class InputValidationCompiler {
  codes: Map<number, string> = new Map();
  #getFunctionName: (idx: number) => string;

  constructor(private tg: TypeGraph, getFunctionName: (idx: number) => string) {
    this.#getFunctionName = getFunctionName;
  }

  generateValidators(rootTypeIdx: number) {
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
          case "float":
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
            cg.generateOptionalValidator(
              typeNode,
              this.#getFunctionName(typeNode.item),
            );
            queue.push(typeNode.item);
            break;
          case "list":
            cg.generateArrayValidator(
              typeNode,
              this.#getFunctionName(typeNode.items),
            );
            queue.push(typeNode.items);
            break;
          case "object":
            cg.generateObjectValidator(
              typeNode,
              mapValues(typeNode.properties, this.#getFunctionName),
            );
            queue.push(...Object.values(typeNode.properties));
            break;
          case "union":
            cg.generateUnionValidator(
              typeNode,
              typeNode.anyOf.map(this.#getFunctionName),
            );
            queue.push(...typeNode.anyOf);
            break;
          case "either":
            cg.generateEitherValidator(
              typeNode,
              typeNode.oneOf.map(this.#getFunctionName),
            );
            queue.push(...typeNode.oneOf);
            break;
          default:
            throw new Error(`Unsupported type: ${typeNode.type}`);
        }
      }

      const fnName = this.#getFunctionName(typeIdx);
      const fnBody = cg.reset().join("\n");
      this.codes.set(
        typeIdx,
        `function ${fnName}(value, path, errors, context) {\n${fnBody}\n}`,
      );
    }

    return refs;
  }

  generate(rootTypeIdx: number): string {
    const fns = this.generateValidators(rootTypeIdx);
    const rootValidatorName = this.#getFunctionName(rootTypeIdx);
    const codes = [...fns].map((idx) => this.codes.get(idx));
    codes.push(`\nreturn ${rootValidatorName}`);

    return codes.join("\n");
  }
}
