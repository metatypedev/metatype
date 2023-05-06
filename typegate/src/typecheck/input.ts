// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraph } from "../typegraph.ts";
import { StringFormat } from "../types/typegraph.ts";
import * as uuid from "std/uuid/mod.ts";
import validator from "npm:validator";
import lodash from "npm:lodash";
import { CodeGenerator } from "./code_generator.ts";

type ErrorEntry = [path: string, message: string];

type FormatValidator = (value: string) => boolean;

interface ValidationContext {
  formatValidators: Record<StringFormat, FormatValidator>;
  deepEqual: <T>(left: T, right: T) => boolean;
}

const formatValidators: Record<StringFormat, FormatValidator> = {
  uuid: uuid.validate,
  json: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch (_e) {
      return false;
    }
  },
  email: validator.isEmail,
  // TODO validatorjs does not have a URI validator, so this is stricter than expected
  uri: (value: string) =>
    validator.isURL(value, {
      require_valid_protocol: false,
      require_host: false,
    }),
  // TODO
  hostname: validator.isFQDN,
  ean: validator.isEAN,
  phone: validator.isMobilePhone, // ??
  date: validator.isDate,
  // datetime: ??
};

export function generateValidator(tg: TypeGraph, typeIdx: number) {
  const validator = new Function(
    new InputValidationCompiler(tg).generate(typeIdx),
  )() as (
    value: unknown,
    path: string,
    errors: Array<ErrorEntry>,
    context: ValidationContext,
  ) => void;

  return (value: unknown) => {
    const errors: ErrorEntry[] = [];
    validator(value, "<value>", errors, {
      formatValidators,
      deepEqual: lodash.isEqual,
    });
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
          case "optional":
            cg.generateOptionalValidator(typeNode, functionName);
            queue.push(typeNode.item);
            break;
          case "array":
            cg.generateArrayValidator(typeNode, functionName);
            queue.push(typeNode.items);
            break;
          case "object":
            cg.generateObjectValidator(typeNode, functionName);
            queue.push(...Object.values(typeNode.properties));
            break;
          case "union":
            cg.generateUnionValidator(typeNode, functionName);
            queue.push(...typeNode.anyOf);
            break;
          case "either":
            cg.generateEitherValidator(typeNode, functionName);
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
