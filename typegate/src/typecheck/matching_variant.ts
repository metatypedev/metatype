// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Type, TypeNode } from "../type_node.ts";
import { TypeGraph } from "../typegraph.ts";
import { CodeGenerator } from "./code_generator.ts";
import { mapValues } from "std/collections/map_values.ts";
import { ErrorEntry, validationContext, ValidatorFn } from "./common.ts";

export type VariantMatcher = (value: unknown) => string | null;

export function flattenUnionVariants(
  tg: TypeGraph,
  variants: number[],
): number[] {
  return variants.flatMap((idx) => {
    const typeNode = tg.type(idx);
    switch (typeNode.type) {
      case Type.UNION:
        return flattenUnionVariants(tg, typeNode.anyOf);
      case Type.EITHER:
        return flattenUnionVariants(tg, typeNode.oneOf);
      default:
        return [idx];
    }
  });
}

// get the all the variants in a multilevel union/either
export function getNestedUnionVariants(
  tg: TypeGraph,
  typeNode: TypeNode,
): number[] {
  switch (typeNode.type) {
    case Type.UNION:
      return flattenUnionVariants(tg, typeNode.anyOf);
    case Type.EITHER:
      return flattenUnionVariants(tg, typeNode.oneOf);
    default:
      throw new Error(`Expected either or union, got '${typeNode.type}'`);
  }
}
// optimized variant matcher for union of objects
export function generateVariantMatcher(
  tg: TypeGraph,
  typeIdx: number,
): VariantMatcher {
  // all variants must be objects
  const variantIndices = getNestedUnionVariants(tg, tg.type(typeIdx));
  const variants = variantIndices.map((idx) => tg.type(idx, Type.OBJECT));

  const validators = new Function(
    new VariantMatcherCompiler(tg).generate(variantIndices),
  )() as ValidatorFn[];

  return (value: unknown) => {
    let errors: ErrorEntry[] = [];
    for (let i = 0; i < variants.length; ++i) {
      const validator = validators[i];
      validator(value, "<value>", errors, validationContext);
      if (errors.length === 0) {
        return variants[i].title;
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

    const validatorNames = variants.map((idx) => functionName(idx));
    const variantValidators = `\nreturn [${validatorNames.join(", ")}]`;

    return [...refs].map((idx) => this.codes.get(idx)).join("\n") +
      variantValidators;
  }
}
