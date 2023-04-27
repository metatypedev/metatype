// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { TypeGraph } from "../../typegraph.ts";
import { TypeIdx } from "../../types.ts";
import { compile } from "./compiler.ts";
import * as uuid from "std/uuid/mod.ts";

interface ValidatorContext {
  formatValidators: Record<string, (s: string) => boolean>;
}

// TODO: path, message
type ValidatorError = string;

interface GeneratedValidator {
  (value: unknown, context: ValidatorContext): ValidatorError[];
}

export function compileValidator(tg: TypeGraph, typeIdx: TypeIdx) {
  const validator = new Function(
    `return ${compile(tg, typeIdx)}`,
  )() as GeneratedValidator;
  console.log({ validator });
  const context = {
    formatValidators: {
      uuid: uuid.validate,
    },
  };
  return (value: unknown) => {
    console.debug("Running validator for value:", value);
    const errors = validator(value, context);
    if (errors.length > 0) {
      throw new Error(`Validation errors: \n  - ${errors.join("\n  - ")}`);
    }
  };
}
