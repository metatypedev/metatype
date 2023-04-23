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
  isEither,
  isOptional,
  isUnion,
  ObjectNode,
  TypeNode,
} from "./type_node.ts";
import { EitherNode, UnionNode } from "./types/typegraph.ts";
import { toPrettyJSON } from "./utils.ts";
import { getLogger } from "./log.ts";
const logger = getLogger("sync");

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

export class SchemaValidatorError extends Error {
  constructor(value: unknown, schemaErrors: ErrorObject[], schema: JSONSchema) {
    let errorMessage = "";

    if (schemaErrors.length > 1) {
      errorMessage = [
        `value: ${toPrettyJSON(value)}`,
        `errors: ${toPrettyJSON(schemaErrors)}`,
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
              const { name, selectionSet, alias } = node;
              const canonicalName = (alias ?? name).value;
              const nameValue = name.value;

              if (name.value === "__typename") {
                properties[canonicalName] = { type: "string" };
                return;
              }

              if (Object.hasOwnProperty.call(baseProperties, nameValue)) {
                const prop = this.types[baseProperties[nameValue]];
                if (!isOptional(prop)) {
                  required.push(canonicalName);
                }
                properties[canonicalName] = this.get(
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
        const currentType = this.types[type.items];
        if (isOptional(currentType)) {
          const item = this.types[currentType.item];
          if (isEither(item) || isUnion(item)) {
            // optional requires a list of all variant types ([undefined, "null"] does not work)
            // TODO:
            // 1. enumerate all types properly for union/either
            // (see: args.ts: JsonSchemaBuilder.listUnionEitherTypes)
            // 2. Or.. make it so that `array` ignores the optional wrapper
            //  array(optional(x)) => array(x)

            // this fix partially implements 2
            return {
              ...trimType(type),
              items: this.get(path, item, selectionSet),
            };
          }
        }

        return {
          ...trimType(type),
          items: this.get(path, currentType, selectionSet),
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
          throw new Error(
            `Path ${path} cannot be a field selection on value of type ${type.type}`,
          );
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
  ): JSONSchema {
    const variantTypesIndexes: number[] = getVariantTypesIndexes(typeNode);

    const variants = variantTypesIndexes.map(
      (typeIndex) => this.types[typeIndex],
    );
    const variantsSchema: JSONSchema[] = [];
    const undefinedNodePaths = new Map<string, number>();
    const errorsCounter = new Map<string, number>();

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
          let count = errorsCounter.get(error.message) || 0;
          count += 1;
          errorsCounter.set(error.message, count);
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

    // only throw errors that appear on all the subschemes
    for (const [message, count] of errorsCounter) {
      if (count === variants.length) {
        throw new Error(message);
      }
    }

    const trimmedType = trimType(typeNode);

    // remove `type` field as is ruled by the subschemes
    delete trimmedType.type;

    const filteredVariantsSchema = variantsSchema.filter(
      (variant) => Object.keys(variant.properties || {}).length > 0,
    );

    // only return the schema if there is at least a variant,
    // since `anyOf` and `oneOf` fields cannot be empty arrays
    if (filteredVariantsSchema.length < 1) {
      return {};
    }

    const schema = {
      ...trimmedType,
    };

    if (isUnion(typeNode)) {
      schema.anyOf = filteredVariantsSchema;
    } else {
      schema.oneOf = filteredVariantsSchema;
    }

    return schema;
  }
}

export function addJsonFormat(ajv: Ajv) {
  ajv.addFormat("json", (data: string) => {
    try {
      JSON.parse(data);
      return true;
    } catch (e) {
      return false;
    }
  });
}

const ajv = new Ajv({ removeAdditional: true });
addFormats(ajv);
addJsonFormat(ajv);

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
      console.error("Some errors occurred while validating: ", value);
      console.error({ errors: this.validator.errors });
      throw new SchemaValidatorError(value, this.validator.errors, this.schema);
    }
  }
}
