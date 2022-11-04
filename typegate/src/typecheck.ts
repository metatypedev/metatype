// Copyright Metatype under the Elastic License 2.0.

// deno-lint-ignore-file no-unused-vars
import type * as jst from "json_schema_typed";
import { Kind } from "graphql";
import Ajv, { ValidateFunction } from "ajv";

import addFormats from "ajv-formats";
import {
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from "graphql/ast";
import { FragmentDefs } from "./graphql.ts";
import { ObjectNode, TypeNode } from "./type_node.ts";

// we will use this jsonschema jit compiler: https://github.com/sinclairzx81/typebox
// and the types format will become a superset of the jsonschema https://json-schema.org/understanding-json-schema/reference/index.html
// & https://json-schema.org/understanding-json-schema/structuring.html
// especially we will use json pointer to encode the typegraph https://json-schema.org/understanding-json-schema/structuring.html#json-pointer
// it will allow to extend some type later using wasi "typechecking" https://github.com/chiefbiiko/json-schm-wasm
// for now but we will add directely the following new jsonschema "type"
// - optional
// - func

type JSONSchema = Exclude<jst.JSONSchema, boolean>;

function trimType(node: TypeNode): JSONSchema {
  const { runtime, policies, ...ret } = node;
  return ret as unknown as JSONSchema;
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
    const rootPath = name?.value ?? (operation[0].toUpperCase());
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

        const addProperty = (node: SelectionNode) => {
          switch (node.kind) {
            case Kind.FIELD: {
              const { name, selectionSet } = node;
              if (Object.hasOwnProperty.call(baseProperties, name.value)) {
                let prop = this.types[baseProperties[name.value]];
                if (prop.type !== "optional") {
                  required.push(name.value);
                } else {
                  prop = this.types[prop.item];
                }
                properties[name.value] = this.get(
                  `${path}.${name.value}`,
                  prop,
                  selectionSet,
                );
              } else {
                throw new Error(`${path}.${name.value} is undefined`);
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

        return {
          ...trimType(type),
          properties,
          required,
        };
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

      default:
        if (selectionSet != undefined) {
          throw new Error(`Path ${path} cannot be a field selection`);
        }
        return trimType(type);
    }
  }
}

const ajv = new Ajv();
addFormats(ajv);

// Validator of query response
export class TypeCheck {
  validator: ValidateFunction;
  // serializer: any;

  constructor(schema: JSONSchema) {
    this.validator = ajv.compile(schema);
    // this.serializer = ajv.compileSerializer(schema);
  }

  public check(value: any): boolean {
    return this.validator(value);
  }

  public validate(value: any) {
    if (!this.check(value)) {
      const errors = this.validator.errors!
        .map((err) => `${err.message} at ${err.instancePath}`);
      throw new Error(`errors: ${errors.join(", ")}`);
    }
  }
}
