// Copyright Metatype under the Elastic License 2.0.

// deno-lint-ignore-file no-unused-vars
import { ObjectOptions, TSchema, Type } from "typebox";
import { Format } from "typebox/format";
import { TypeCheck as TboxTypeCheck, TypeCompiler } from "typebox/compiler";
import { Value } from "typebox/value";
import { z } from "zod";
import type * as jst from "json_schema_typed";
import { ensure } from "./utils.ts";
import { mapValues } from "std/collections/map_values.ts";
import { updateIn } from "https://deno.land/x/immutable@4.0.0-rc.14-deno/mod.ts";
import { Kind } from "graphql";
import {
  OperationDefinitionNode,
  SelectionNode,
  SelectionSetNode,
} from "graphql/ast";
import { FragmentDefs } from "./graphql.ts";

// we will use this jsonschema jit compiler: https://github.com/sinclairzx81/typebox
// and the types format will become a superset of the jsonschema https://json-schema.org/understanding-json-schema/reference/index.html
// & https://json-schema.org/understanding-json-schema/structuring.html
// especially we will use json pointer to encode the typegraph https://json-schema.org/understanding-json-schema/structuring.html#json-pointer
// it will allow to extend some type later using wasi "typechecking" https://github.com/chiefbiiko/json-schm-wasm
// for now but we will add directely the following new jsonschema "type"
// - optional
// - func

Format.Set("email", (value) => z.string().email().safeParse(value).success);
Format.Set("uuid", (value) => z.string().uuid().safeParse(value).success);
Format.Set("uri", (value) => z.string().url().safeParse(value).success);

function refToPath(ref: string) {
  return ref.replace(/^.*\#\/?/, "").split("/");
}

function resolve(obj: any, path: string[]) {
  return path.reduce((o, key) => o[key], obj);
}

interface FunctionSchema {
  type: "function";
  input: JSONSchema;
  output: JSONSchema;
}

type ExtendedJSONSchema<T = any> =
  | Exclude<jst.JSONSchema, boolean>
  | FunctionSchema;

type JSONSchema = Exclude<jst.JSONSchema, boolean>;

const SchemaOptionsType = Type.Object({
  $schema: Type.Optional(Type.String()),
  $id: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  default: Type.Optional(Type.Any()),
  examples: Type.Optional(Type.Any()),
}, { additionalProperties: false });

export class ValidationSchemaBuilder {
  private refs: Set<string> = new Set();
  private transformedRefs: Set<string> = new Set();
  constructor(private root: ExtendedJSONSchema) {}

  build(): JSONSchema {
    ensure(this.root.type === "object", "schema root must be an object");
    // TODO more assertions: properties must be functions, outputs are refs

    let res: JSONSchema = this.intoValidationSchema(this.root);

    while (this.refs.size > 0) {
      const transformed: string[] = [];
      for (const ref of this.refs) {
        res = updateIn(
          res,
          refToPath(ref),
          (s) => this.intoValidationSchema(s as JSONSchema),
        );
        transformed.push(ref);

        this.transformedRefs.add(ref);
        this.refs.delete(ref); // should be safe, according to the spec (https://262.ecma-international.org/6.0/#sec-set-objects)
      }
    }

    return res;
  }

  private intoValidationSchema(schema: ExtendedJSONSchema): JSONSchema {
    if ("$ref" in schema && schema.$ref) {
      const ref = schema.$ref;
      if (!this.transformedRefs.has(ref)) {
        this.refs.add(ref);
      }
      return schema as JSONSchema;
    }

    switch (schema.type) {
      // scalars
      case "string":
      case "number":
      case "integer":
      case "boolean":
      case "null":
        return schema;

      case "object": {
        return {
          ...schema,
          properties: mapValues(
            schema.properties!,
            (propSchema) =>
              this.intoValidationSchema(propSchema as ExtendedJSONSchema),
          ),
        };
      }

      case "array":
        return {
          ...schema,
          items: this.intoValidationSchema(schema.items as ExtendedJSONSchema),
        };

      case "function":
        return this.intoValidationSchema((schema as FunctionSchema).output);

      default:
        throw new Error(
          `Unsupported type ${schema.type} in ${JSON.stringify(schema)}`,
        );
    }
  }
}

export class TypeCheck {
  constructor(private baseSchema: JSONSchema) {}

  /**
   * Ensures that a GraphQL query described by the `operation` and `fragments`
   * params is valid.
   * @param operation operation definition node of the GraphQL query to validate
   * @param fragments fragment definitions for the GraphQL query to validate
   * @returns Query response typechecking object
   * @throws {Error} - Thrown if the query is not valid.
   * The error message describes why the query is not valid.
   */
  validateQuery(
    operation: OperationDefinitionNode,
    fragments: FragmentDefs,
  ): QueryTypeCheck {
    const schema = new QuerySchemaBuilder(this.baseSchema, operation, fragments)
      .build();
    return new QueryTypeCheck(schema);
  }
}

type Properties = Record<string, JSONSchema>;

class QuerySchemaBuilder {
  constructor(
    private baseSchema: JSONSchema,
    private operation: OperationDefinitionNode,
    private fragments: FragmentDefs,
  ) {}

  public build(): JSONSchema {
    const rootPath = this.operation.name?.value ??
      (this.operation.operation[0].toUpperCase());
    return this.get(rootPath, this.baseSchema, this.operation.selectionSet);
  }

  private resolve(path: string[]): JSONSchema {
    return path.reduce((o, key, idx) => {
      const next = o[key];
      if (next == null) {
        throw new Error(
          `schema not found at ${path.join("/")}, value at ${
            path.slice(0, idx + 1)
          } is undefined`,
        );
      }
      return next;
    }, this.baseSchema as any);
  }

  private get(
    path: string,
    base: JSONSchema,
    selectionSet: SelectionSetNode | undefined,
  ): JSONSchema {
    if (base.$ref != null) {
      return this.get(path, this.resolve(refToPath(base.$ref)), selectionSet);
    }

    switch (base.type) {
      case "object": {
        const properties = {} as Properties;
        const baseProperties = (base.properties ?? {}) as Properties;
        if (selectionSet == undefined) {
          throw new Error(`Path ${path} must be a field selection`);
        }

        const addProperty = (node: SelectionNode) => {
          switch (node.kind) {
            case Kind.FIELD: {
              const { name, selectionSet } = node;
              if (Object.hasOwnProperty.call(baseProperties, name.value)) {
                properties[name.value] = this.get(
                  `${path}.${name.value}`,
                  baseProperties[name.value],
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

        const schema = {
          ...base,
          properties,
          required: (base.required ?? []).filter((key) =>
            Object.hasOwnProperty.call(properties, key)
          ),
        };
        delete schema.$defs;

        return schema;
      }

      case "array": {
        return {
          ...base,
          items: this.get(path, base.items as JSONSchema, selectionSet),
        };
      }

      default:
        if (selectionSet != undefined) {
          throw new Error(`Path ${path} cannot be a field selection`);
        }
        return base;
    }
  }
}

export class QueryTypeCheck {
  private typecheckSchema: TSchema;
  private valueCastSchema: TSchema;
  private typecheck: TboxTypeCheck<any>;

  constructor(private schema: JSONSchema) {
    this.typecheckSchema = this.tschema(this.schema, {});
    this.typecheck = TypeCompiler.Compile(this.typecheckSchema);
    this.valueCastSchema = this.tschema(this.schema, {
      additionalProperties: false,
    });
  }

  // We won't be checking any object against the full schema.
  // We will only be checking agaist the schema corresponding to GraphQL selection fields.
  public check(value: any): boolean {
    return this.typecheck.Check(value);
  }

  public validate(value: any): any {
    if (!this.check(value)) {
      const errors = [...this.typecheck.Errors(value)]
        .map((err) => `${err.message} at ${err.path}`);
      throw new Error(`errors: ${errors.join(", ")}`);
    }

    return Value.Cast(this.valueCastSchema, value);
  }

  private tschema(schema: JSONSchema, objectOptions: ObjectOptions): TSchema {
    if (schema.$ref != null) {
      return this.tschema(this.resolve(refToPath(schema.$ref)), objectOptions);
    }

    switch (schema.type) {
      case "string":
        if (schema.pattern != null) {
          return Type.RegEx(new RegExp(schema.pattern!));
        }
        // TODO combine options
        if (schema.format != null) {
          return Type.String({ format: schema.format! });
        }
        return Type.String();
      case "number":
        return Type.Number();
      case "integer":
        return Type.Integer();
      case "boolean":
        return Type.Boolean();
      case "null":
        return Type.Null();
      case "array":
        return Type.Array(
          this.tschema(schema.items! as JSONSchema, objectOptions),
          Value.Cast(SchemaOptionsType, schema),
        );
      case "object": {
        const required = new Set(schema.required);
        const props = {} as Record<string, TSchema>;
        for (const [k, s] of Object.entries(schema.properties ?? {})) {
          const tb = this.tschema(s as JSONSchema, objectOptions);
          props[k] = required.has(k) ? tb : Type.Optional(tb);
        }
        return Type.Object(props, {
          ...Value.Cast(SchemaOptionsType, schema),
          ...objectOptions,
        });
      }

      default:
        throw new Error(`Unsupported type: ${schema.type}`);
    }
  }

  private resolve(path: string[]): JSONSchema {
    const schema = resolve(this.schema, path);
    if (schema == null) {
      throw new Error(`Schema not found at /${path.join("/")}`);
    }
    return schema;
  }
}

const tg = {
  "types": [
    // each type should be jsonschema compatible type with extension
  ],
  "materializers": [
    // ... as today
  ],
  "runtimes": [
    // ... as today
  ],
  "policies": [
    // ... as today
  ],
  "meta": {
    // ... as today
  },
};
