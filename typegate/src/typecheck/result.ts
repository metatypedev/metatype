// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { FragmentDefs } from "../graphql.ts";
import {
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from "graphql/ast";
import { FieldNode, Kind } from "graphql";
import { isScalar, ObjectNode, Type } from "../type_node.ts";
import { TypeGraph } from "../typegraph.ts";
import { CodeGenerator } from "./code_generator.ts";
import { getChildTypes } from "../typegraph/visitor.ts";
import { mapValues } from "std/collections/map_values.ts";
import {
  ErrorEntry,
  validationContext,
  Validator,
  ValidatorFn,
} from "./common.ts";
import {
  flattenUnionVariants,
  getNestedUnionVariants,
} from "./matching_variant.ts";

export function generateValidator(
  tg: TypeGraph,
  operation: OperationDefinitionNode,
  fragments: FragmentDefs,
): Validator {
  const code = new ResultValidationCompiler(tg, fragments).generate(operation);
  const validator = new Function(code)() as ValidatorFn;

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

interface QueueEntry {
  name: string;
  typeIdx: number;
  selectionSet?: SelectionSetNode | undefined;
  path: string;
}

export class ResultValidationCompiler {
  codes: Map<string, string> = new Map();
  counter = 0;

  constructor(private tg: TypeGraph, private fragments: FragmentDefs) {}

  private validatorName(idx: number, additionalSuffix = false) {
    if (!additionalSuffix) {
      return `validate_${idx}`;
    }

    this.counter += 1;
    return `validate_${idx}_${this.counter}`;
  }

  private getRootQueueEntry(opDef: OperationDefinitionNode): QueueEntry {
    const { name, operation, selectionSet } = opDef;
    const rootTypeIdx = this.tg.type(0, Type.OBJECT).properties[operation];
    if (rootTypeIdx == null) {
      throw new Error(`Unsupported operation '${operation}'`);
    }
    const rootPath = name?.value ?? operation[0].toUpperCase();
    // TODO check if selection set is required or prohibited
    return {
      name: this.validatorName(rootTypeIdx, true),
      typeIdx: rootTypeIdx,
      selectionSet,
      path: rootPath,
    };
  }

  generate(opDef: OperationDefinitionNode) {
    const cg = new CodeGenerator();
    const rootEntry = this.getRootQueueEntry(opDef);
    const queue: QueueEntry[] = [rootEntry];
    const refs = new Set([rootEntry.name]);

    for (
      let entry = queue.shift();
      entry != null;
      entry = queue.shift()
    ) {
      refs.add(entry.name);
      if (this.codes.has(entry.name)) {
        continue;
      }

      const typeNode = this.tg.type(entry.typeIdx);

      if (entry.name === "validate_typename") {
        cg.generateStringValidator({
          type: "string",
          title: "__TypeName",
          runtime: -1,
          policies: [],
          as_id: false,
        });
      } else if (isScalar(typeNode)) {
        if (entry.selectionSet != null) {
          throw new Error(
            `Unexpected selection set for scalar type '${typeNode.type}' at '${entry.path}'`,
          );
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
          }
        }
      } else {
        // TODO: cannot check enum - perhaps we should disable enums for non-scalar types??

        switch (typeNode.type) {
          case "optional": {
            const itemValidatorName = this.validatorName(
              typeNode.item,
              entry.selectionSet != null,
            );
            cg.generateOptionalValidator(typeNode, itemValidatorName);
            queue.push({
              name: itemValidatorName,
              typeIdx: typeNode.item,
              selectionSet: entry.selectionSet,
              path: entry.path,
            });
            break;
          }

          case "array": {
            const itemValidatorName = this.validatorName(
              typeNode.items,
              entry.selectionSet != null,
            );
            cg.generateArrayValidator(typeNode, itemValidatorName);
            queue.push({
              name: itemValidatorName,
              typeIdx: typeNode.items,
              selectionSet: entry.selectionSet,
              path: entry.path,
            });
            break;
          }

          case "object": {
            const childEntries: Record<string, QueueEntry> = this
              .getChildEntries(typeNode, entry);
            cg.generateObjectValidator(
              typeNode,
              mapValues(childEntries, (e) => e.name),
            );
            queue.push(...Object.values(childEntries));
            break;
          }

          case "union": {
            const childEntries = this.getVariantEntries(typeNode.anyOf, entry);
            cg.generateUnionValidator(
              typeNode,
              childEntries.map((e) => e.name),
            );
            queue.push(...childEntries);
            break;
          }

          case "either": {
            const childEntries = this.getVariantEntries(typeNode.oneOf, entry);
            cg.generateEitherValidator(
              typeNode,
              childEntries.map((e) => e.name),
            );
            queue.push(...childEntries);
            break;
          }

          case "function": {
            const outputValidator = this.validatorName(
              typeNode.output,
              entry.selectionSet != null,
            );
            cg.line(`${outputValidator}(value, path, errors, context)`);
            queue.push({
              name: outputValidator,
              path: entry.path,
              typeIdx: typeNode.output,
              selectionSet: entry.selectionSet,
            });
            break;
          }

          default:
            throw new Error(`Unsupported type ${typeNode.type}`);
        }
      }

      const fnName = entry.name;
      const fnBody = cg.reset().join("\n");
      this.codes.set(
        fnName,
        `function ${fnName}(value, path, errors, context) {\n${fnBody}\n}`,
      );
    }

    const rootValidator = `\nreturn ${rootEntry.name}`;

    return [...refs].map((name) => this.codes.get(name)).join("\n") +
      rootValidator;
  }

  private getChildEntryFromFieldNode(
    typeNode: ObjectNode,
    entry: QueueEntry,
    node: FieldNode,
  ): [string, QueueEntry] {
    const { name, selectionSet, alias } = node;
    const propName = alias?.value ?? name.value;
    if (name.value === "__typename") {
      return [propName, {
        name: "validate_typename",
        typeIdx: -1,
        path: entry.path + ".__typename",
      } as QueueEntry];
    }

    if (!Object.hasOwn(typeNode.properties, name.value)) {
      throw new Error(
        `Unexpected property '${name.value}' at '${entry.path}'`,
      );
    }

    const propTypeIdx = typeNode.properties[name.value];
    const path = `${entry.path}.${name.value}`;
    let validator: string;
    if (this.hasNestedObjectResult(propTypeIdx)) {
      if (selectionSet == null) {
        throw new Error(
          `Selection set required at '${path}'`,
        );
      }
      validator = this.validatorName(propTypeIdx, true);
    } else {
      if (selectionSet != null) {
        throw new Error(
          `Unexpected selection set at '${path}'`,
        );
      }
      validator = this.validatorName(propTypeIdx, false);
    }

    return [propName, {
      name: validator,
      path,
      typeIdx: propTypeIdx,
      selectionSet,
    } as QueueEntry];
  }

  private getChildEntriesFromSelectionNode(
    typeNode: ObjectNode,
    entry: QueueEntry,
    node: SelectionNode,
  ): Array<[string, QueueEntry]> {
    switch (node.kind) {
      case Kind.FIELD:
        return [this.getChildEntryFromFieldNode(typeNode, entry, node)];

      case Kind.FRAGMENT_SPREAD: {
        const fragment = this.fragments[node.name.value];
        return fragment.selectionSet.selections.flatMap((selectionNode) =>
          this.getChildEntriesFromSelectionNode(typeNode, entry, selectionNode)
        );
      }

      case Kind.INLINE_FRAGMENT: {
        if (node.typeCondition != null) {
          throw new Error("Unexpected type condition on non-union type");
        }
        return node.selectionSet.selections.flatMap((selectionNode) =>
          this.getChildEntriesFromSelectionNode(
            typeNode,
            entry,
            selectionNode,
          )
        );
      }

      default:
        throw new Error("Not implemented");
    }
  }

  private getChildEntries(
    typeNode: ObjectNode,
    entry: QueueEntry,
  ): Record<string, QueueEntry> {
    return Object.fromEntries(
      entry.selectionSet!
        .selections.flatMap((node) =>
          this.getChildEntriesFromSelectionNode(typeNode, entry, node)
        ),
    );
  }

  private getVariantEntries(
    variants: number[],
    entry: QueueEntry,
  ): QueueEntry[] {
    const multilevelVariants = flattenUnionVariants(this.tg, variants);
    if (entry.selectionSet == null) {
      if (
        multilevelVariants.some((variantIdx) =>
          !isScalar(this.tg.type(variantIdx))
        )
      ) {
        const hasScalar = variants.some((idx) => isScalar(this.tg.type(idx)));
        if (hasScalar) {
          // TODO: AOT validation for the typegraph
          throw new Error(
            `Either/union variants must be either all scalars or all objects at '${entry.path}'`,
          );
        }
        throw new Error(`Selection set required at '${entry.path}'`);
      }
      return variants.map((variantIdx) => ({
        name: this.validatorName(variantIdx, false),
        path: entry.path,
        typeIdx: variantIdx,
      }));
    }

    if (
      multilevelVariants.some((idx) => this.tg.type(idx).type !== Type.OBJECT)
    ) {
      throw new Error(
        `Either/union variants must be either all scalars or all objects at '${entry.path}'`,
      );
    }

    const variantSelections = new Map(
      entry.selectionSet.selections.map((node) => {
        if (node.kind !== Kind.INLINE_FRAGMENT || node.typeCondition == null) {
          throw new Error(
            `at '${entry.path}': selection nodes must be inline fragments with type condition`,
          );
        }
        return [node.typeCondition.name.value, node];
      }),
    );

    const entries: QueueEntry[] = variants.map((variantIdx) => {
      const variantType = this.tg.type(variantIdx);
      switch (variantType.type) {
        case Type.OBJECT: {
          const typeName = variantType.title;
          const selectionSet = variantSelections.get(typeName)?.selectionSet;
          if (selectionSet == null) {
            throw new Error(
              `at '${entry.path}': variant type '${typeName}' must be selected with type condition inline fragment`,
            );
          }
          variantSelections.delete(typeName);
          return {
            name: this.validatorName(variantIdx, true),
            path: entry.path,
            typeIdx: variantIdx,
            selectionSet,
          };
        }

        case Type.UNION:
        case Type.EITHER: {
          const variantIndices = getNestedUnionVariants(this.tg, variantType);
          return {
            name: this.validatorName(variantIdx, true),
            path: entry.path,
            typeIdx: variantIdx,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: variantIndices.map((idx) => {
                const typeNode = this.tg.type(idx);
                const typeName = typeNode.title;
                const node = variantSelections.get(typeName);
                if (node == null) {
                  throw new Error(
                    `at '${entry.path}': variant type '${typeName}' must be selected with type condition inline fragment`,
                  );
                }
                variantSelections.delete(typeName);
                return node;
              }),
            },
          };
        }

        default:
          throw new Error();
      }
    });

    if (variantSelections.size > 0) {
      const names = [...variantSelections.keys()].join(", ");
      throw new Error(
        `at '${entry.path}': Unexpected type conditions: ${names}`,
      );
    }
    return entries;
  }

  private hasNestedObjectResult(typeIdx: number): boolean {
    const queue = [typeIdx];

    for (let idx = queue.shift(); idx != null; idx = queue.shift()) {
      const typeNode = this.tg.type(idx);
      switch (typeNode.type) {
        case Type.OBJECT:
          return true;
        case Type.FUNCTION:
          queue.push(typeNode.output);
          break;
        default:
          queue.push(...getChildTypes(typeNode));
      }
    }
    return false;
  }
}
