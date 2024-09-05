// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  type EitherNode,
  Type,
  type UnionNode,
} from "../../typegraph/type_node.ts";
import type { TypeGraph } from "../../typegraph/mod.ts";
import { CodeGenerator } from "./code_generator.ts";
import { mapValues } from "@std/collections/map-values";
import {
  type ErrorEntry,
  validationContext,
  type ValidatorFn,
} from "./common.ts";

export type VariantMatcher = (value: unknown) => string | null;

/** get variant selector for selectable variants */
export function generateVariantMatcher(
  tg: TypeGraph,
  typeNode: UnionNode | EitherNode,
): VariantMatcher {
  // selectable variants
  const variants = tg.typeUtils.getFlatUnionVariants(typeNode);
  // .filter((idx) => tg.isScalarOrListOfScalars(tg.type(idx)));

  const validators = new Function(
    new VariantMatcherCompiler(tg).generate(variants),
  )() as ValidatorFn[];

  return (value: unknown) => {
    let errors: ErrorEntry[] = [];
    for (let i = 0; i < variants.length; ++i) {
      const validator = validators[i];
      validator(value, "<value>", errors, validationContext);
      if (errors.length === 0) {
        return tg.type(variants[i]).title;
      }
      errors = [];
    }
    return null;
  };
}

function functionName(typeIdx: number) {
  return `validate_${typeIdx}`;
}

class VariantMatcherCompiler {
  codes: Map<number, string> = new Map();

  constructor(private tg: TypeGraph) {}

  generate(variants: number[]): string {
    // TODO onError: return
    const cg = new CodeGenerator();
    const queue = [...variants];
    const refs = new Set(variants);

    for (
      let typeIdx = queue.shift();
      typeIdx != null;
      typeIdx = queue.shift()
    ) {
      refs.add(typeIdx);
      if (this.codes.has(typeIdx)) {
        continue;
      }
      let typeNode = this.tg.type(typeIdx);
      if (typeNode.type === Type.FUNCTION) {
        typeNode = this.tg.type(typeNode.output);
      }

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
          case "optional":
            cg.generateOptionalValidator(typeNode, functionName(typeNode.item));
            queue.push(typeNode.item);
            break;
          case "list":
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

    const validatorNames = variants.map((idx) => functionName(idx));
    const variantValidators = `\nreturn [${validatorNames.join(", ")}]`;

    return (
      [...refs].map((idx) => this.codes.get(idx)).join("\n") + variantValidators
    );
  }
}
