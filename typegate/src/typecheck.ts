// Copyright Metatype under the Elastic License 2.0.

// deno-lint-ignore-file no-unused-vars
import { TSchema, Type } from "typebox";
import { Format } from "typebox/format";
import { TypeCheck as TboxTypeCheck, TypeCompiler } from "typebox/compiler";
import { Value } from "typebox/value";
import { z } from "zod";
import type * as jst from "json_schema_typed";
import { ensure, has } from "./utils.ts";
import { mapValues } from "std/collections/map_values.ts";
import { updateIn } from "https://deno.land/x/immutable@4.0.0-rc.14-deno/mod.ts";

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
});

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
          ["$defs", ref],
          (s) => {
            if (s == null) {
              throw new Error(`schema at $defs/${ref} is undefined`);
            }
            return this.intoValidationSchema(s as JSONSchema);
          },
        );
        ensure(
          (res.$defs?.[ref] as JSONSchema).$id === ref,
          "$id does not match to key in $defs",
        );
        transformed.push(ref);

        this.transformedRefs.add(ref);
        this.refs.delete(ref); // should be safe, according to the spec (https://262.ecma-international.org/6.0/#sec-set-objects)
      }
    }

    return res;
  }

  private intoValidationSchema(schema: ExtendedJSONSchema): JSONSchema {
    if (has(schema, "$ref")) {
      const ref = schema.$ref;
      if (!this.transformedRefs.has(ref)) {
        this.refs.add(ref);
      }
      return schema;
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
  private schemasByRef: Map<string, TSchema> = new Map();
  private schemas: TSchema[] = [];
  private typecheck: TboxTypeCheck<any>;

  constructor(private schema: Exclude<jst.JSONSchema, boolean>) {
    const tschema = this.get();
    this.typecheck = TypeCompiler.Compile(tschema, this.schemas);
    console.log("-- code --");
    console.log(this.typecheck.Code());
    console.log("-- ---- --");
  }

  public check(value: any): boolean {
    return this.typecheck.Check(value);
  }

  public validate(value: any) {
    if (!this.check(value)) {
      const errors = [...this.typecheck.Errors(value)];
      throw new Error(`errors: ${JSON.stringify(errors)}`);
    }
  }

  private get(ref?: string): TSchema {
    if (ref == null) return this.tschema(this.schema);
    const cached = this.schemasByRef.get(ref);
    if (cached != null) {
      return cached;
    }

    const schema = this.schema.$defs?.[ref] as JSONSchema | undefined;
    if (schema == null) {
      throw new Error(`reference ${ref} not found at .$defs`);
    }

    const tschema = this.tschema(schema);
    this.schemasByRef.set(ref, tschema);
    this.schemas.push(tschema);

    return tschema;
  }

  private tschema(schema: JSONSchema): TSchema {
    if (has(schema, "$ref")) {
      // TODO handle circular references
      const ref = this.get(schema.$ref);
      ensure(
        ref.$id === schema.$ref,
        `$id on the schema does not match the $ref; ${ref.$id} != ${schema.$ref}`,
      );
      return Type.Ref(this.get(schema.$ref));
    }

    switch (schema.type) {
      case "string":
        if (has(schema, "pattern")) {
          return Type.RegEx(new RegExp(schema.pattern!));
        }
        // TODO combine options
        if (has(schema, "format")) {
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
          this.tschema(schema.items! as JSONSchema),
          Value.Cast(SchemaOptionsType, schema),
        );
      case "object": {
        const required = new Set(schema.required);
        const props = {} as Record<string, TSchema>;
        for (const [k, s] of Object.entries(schema.properties ?? {})) {
          const tb = this.tschema(s as JSONSchema);
          props[k] = required.has(k) ? tb : Type.Optional(tb);
        }
        return Type.Object(props, Value.Cast(SchemaOptionsType, schema));
      }

      default:
        throw new Error(`Unsupported type: ${schema.type}`);
    }
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
