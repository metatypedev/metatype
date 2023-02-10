// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

// deno-lint-ignore-file no-unused-vars
import type * as jst from "json_schema_typed";
import { Kind } from "graphql";
import Ajv, { ErrorObject, ValidateFunction } from "ajv";

import addFormats from "ajv-formats";
import {
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from "graphql/ast";
import { FragmentDefs } from "./graphql.ts";
import {
  getVariantTypesIndexes,
  isOptional,
  isUnion,
  ObjectNode,
  TypeNode,
} from "./type_node.ts";
import { EitherNode, UnionNode } from "./types/typegraph.ts";

// we will use this jsonschema jit compiler: https://github.com/sinclairzx81/typebox
// and the types format will become a superset of the jsonschema https://json-schema.org/understanding-json-schema/reference/index.html
// & https://json-schema.org/understanding-json-schema/structuring.html
// especially we will use json pointer to encode the typegraph https://json-schema.org/understanding-json-schema/structuring.html#json-pointer
// it will allow to extend some type later using wasi "typechecking" https://github.com/chiefbiiko/json-schm-wasm
// for now but we will add directely the following new jsonschema "type"
// - optional
// - func

export type JSONSchema = Exclude<jst.JSONSchema, boolean>;

export function trimType(node: TypeNode): JSONSchema {
  const { runtime, policies, config, injection, inject, ...ret } = node;
  return ret as unknown as JSONSchema;
}

class InvalidNodePathsError extends Error {
  constructor(
    public invalidNodePaths: string[],
    public generatedSchema: JSONSchema,
  ) {
    const nodePaths = invalidNodePaths.join(", ");
    const quantifier = invalidNodePaths.length <= 1 ? "is" : "are";

    super(`${nodePaths} ${quantifier} undefined`);
  }
}

function toPrettyJSON(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export class SchemaValidatorError extends Error {
  constructor(value: unknown, schemaErrors: ErrorObject[], schema: JSONSchema) {
    let errorMessage = "";

    if (schemaErrors.length > 1) {
      errorMessage = [
        `value: ${toPrettyJSON(value)}`,
        `errors: ${toPrettyJSON(schemaErrors)}`,
        `schema: ${toPrettyJSON(schema)}`,
      ].join("\n\n");
    } else {
      // if there is only one error, return it instead of the whole error,
      // as it may be redundant
      const error = schemaErrors[0];
      errorMessage = `${error.message} at ${error.instancePath}`;
    }

    super(errorMessage);
  }
}

// Build a jsonschema for a query result
export class ValidationSchemaBuilder {
  constructor(
    private types: Array<TypeNode>,
    private operation: OperationDefinitionNode,
    private fragments: FragmentDefs,
  ) {}

  public build(): JSONSchema {
    const { name, operation } = this.operation;
    const rootPath = name?.value ?? operation[0].toUpperCase();
    if (operation !== "query" && operation !== "mutation") {
      throw new Error(`unsupported operation type: ${operation}`);
    }
    const rootTypeIdx = (this.types[0] as ObjectNode).properties[operation];

    return this.get(
      rootPath,
      this.types[rootTypeIdx],
      this.operation.selectionSet,
    );
  }

  private get(
    path: string,
    type: TypeNode,
    selectionSet: SelectionSetNode | undefined,
  ): JSONSchema {
    switch (type.type) {
      case "object": {
        const properties = {} as Record<string, JSONSchema>;
        const required = [] as string[];
        const baseProperties = type.properties ?? {};
        if (selectionSet == undefined) {
          throw new Error(`Path ${path} must be a field selection`);
        }

        // variable helper to bundle all the errors found instead of throwing
        // on the first error found
        const invalidNodePaths: string[] = [];

        const addProperty = (node: SelectionNode) => {
          switch (node.kind) {
            case Kind.FIELD: {
              const { name, selectionSet } = node;

              if (name.value === "__typename") {
                properties[name.value] = { type: "string" };
                return;
              }

              if (Object.hasOwnProperty.call(baseProperties, name.value)) {
                const prop = this.types[baseProperties[name.value]];
                if (!isOptional(prop)) {
                  required.push(name.value);
                }
                properties[name.value] = this.get(
                  `${path}.${name.value}`,
                  prop,
                  selectionSet,
                );
              } else {
                const nodePath = `${path}.${name.value}`;
                invalidNodePaths.push(nodePath);
              }
              break;
            }

            case Kind.FRAGMENT_SPREAD: {
              const fragment = this.fragments[node.name.value];
              for (const selectionNode of fragment.selectionSet.selections) {
                addProperty(selectionNode);
              }
              break;
            }

            case Kind.INLINE_FRAGMENT: {
              for (const selectionNode of node.selectionSet.selections) {
                addProperty(selectionNode);
              }
              break;
            }
          }
        };

        for (const node of selectionSet.selections) {
          addProperty(node);
        }

        const generatedSchema = {
          ...trimType(type),
          properties,
          required,
          additionalProperties: false,
        };

        if (invalidNodePaths.length > 0) {
          throw new InvalidNodePathsError(invalidNodePaths, generatedSchema);
        }

        return generatedSchema;
      }

      case "union": {
        return this.getGeneralUnionSchema(type, path, selectionSet);
      }

      case "either": {
        return this.getGeneralUnionSchema(type, path, selectionSet);
      }

      case "array": {
        return {
          ...trimType(type),
          items: this.get(path, this.types[type.items], selectionSet),
        };
      }

      case "function": {
        return this.get(path, this.types[type.output], selectionSet);
      }

      case "optional": {
        const itemSchema = this.get(path, this.types[type.item], selectionSet);
        const nullableType = Array.isArray(itemSchema.type)
          ? [...itemSchema.type, "null"]
          : [itemSchema.type, "null"];
        return { ...itemSchema, type: nullableType };
      }

      default:
        if (selectionSet != undefined) {
          throw new Error(`Path ${path} cannot be a field selection`);
        }
        return trimType(type);
    }
  }

  /**
   * Returns the JSON Schema for a node of type `union` or `either`.
   */
  private getGeneralUnionSchema(
    typeNode: UnionNode | EitherNode,
    path: string,
    selectionSet?: SelectionSetNode,
  ) {
    const variantTypesIndexes: number[] = getVariantTypesIndexes(typeNode);

    const variants = variantTypesIndexes.map(
      (typeIndex) => this.types[typeIndex],
    );
    const variantsSchema: JSONSchema[] = [];
    const undefinedNodePaths = new Map<string, number>();

    for (const variant of variants) {
      try {
        const variantSchema = this.get(path, variant, selectionSet);

        variantsSchema.push(variantSchema);
      } catch (error) {
        if (error instanceof InvalidNodePathsError) {
          for (const invalidPath of error.invalidNodePaths) {
            let count = undefinedNodePaths.get(invalidPath) || 0;
            count += 1;
            undefinedNodePaths.set(invalidPath, count);
          }

          variantsSchema.push(error.generatedSchema);
        } else {
          throw error;
        }
      }
    }

    // only throw that a node path is undefined if it doesn't exist on any
    // of the subschemes
    const invalidPaths = [];
    for (const [nodePath, count] of undefinedNodePaths.entries()) {
      if (count === variants.length) {
        invalidPaths.push(nodePath);
      }
    }
    if (invalidPaths.length > 0) {
      throw new InvalidNodePathsError(invalidPaths, {});
    }

    const trimmedType = trimType(typeNode);
    // remove `type` field as the type is ruled by the
    // oneOf subschemes
    const { type: _, ...untyped } = trimmedType;

    const trimmedVariantsSchema = variantsSchema.map((variant) => {
      // remove `additionalProperties = false` if present as each subschema
      // in `allOf` is used to check the properties of a value, therefore
      // without additionalProperties only one variant would be used to check
      const { additionalProperties, ...trimmedVariant } = variant;
      return trimmedVariant;
    });

    if (isUnion(typeNode)) {
      return {
        ...untyped,
        anyOf: trimmedVariantsSchema,
      };
    } else {
      return {
        ...untyped,
        oneOf: trimmedVariantsSchema,
      };
    }
  }
}

const ajv = new Ajv({ removeAdditional: true });
addFormats(ajv);

// Validator of query response
export class TypeCheck {
  validator: ValidateFunction;
  // serializer: any;

  constructor(private readonly schema: JSONSchema) {
    this.validator = ajv.compile(schema);
    // this.serializer = ajv.compileSerializer(schema);
  }

  public static init(
    types: Array<TypeNode>,
    operation: OperationDefinitionNode,
    fragments: FragmentDefs,
  ) {
    const schema = new ValidationSchemaBuilder(
      types,
      operation,
      fragments,
    ).build();
    return new TypeCheck(schema);
  }

  public check(value: unknown): boolean {
    return this.validator(value);
  }

  public validate(value: unknown) {
    this.check(value);

    if (this.validator.errors) {
      console.error({ errors: this.validator.errors });
      throw new SchemaValidatorError(value, this.validator.errors, this.schema);
    }
  }
}
