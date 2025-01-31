// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeGraphDS } from "../../typegraph/mod.ts";
import {
  EitherNode,
  isEither,
  isFunction,
  isList,
  isObject,
  isOptional,
  isScalar,
  isUnion,
  ObjectNode,
  ScalarNode,
  TypeNode,
  UnionNode,
} from "../../typegraph/type_node.ts";
import { AllowOrPass } from "./visibility.ts";
import { TypeVisibility } from "./visibility.ts";
import {
  fieldCommon,
  typeEmptyObjectScalar,
  typeGenericCustomScalar,
} from "./helpers.ts";
import { TypeKind } from "graphql";
import { Resolver } from "../../types.ts";
import { getLogger } from "../../log.ts";

const SCALAR_TYPE_MAP = {
  boolean: "Boolean",
  integer: "Int",
  float: "Float",
  string: "String",
  file: "File",
};

interface GenContext {
  asInput: boolean;
  parentVerdict: AllowOrPass;
  path: Array<string>;
}

const logger = getLogger("introspection_gen");

export class IntrospectionGen {
  types: Array<[string, Record<string, Resolver>]>;
  typesDefined: Set<string>;

  constructor(private tg: TypeGraphDS, private visibility: TypeVisibility) {
    this.types = [];
    this.typesDefined = new Set();
  }

  #define(name: string, schema: Record<string, Resolver>) {
    if (this.typesDefined.has(name)) {
      logger.debug(`Already emitted type of name ${name}`);
      return;
    }

    logger.debug(`Emitted: ${name} => ${Deno.inspect(schema)}`);
    this.types.push([name, schema]);
    this.typesDefined.add(name);
  }

  #getName(typeOrName: TypeNode, asInput: boolean | null) {
    const nameIt = (title: string) =>
      `${title}${asInput ? title + "_Inp" : ""}`;

    const type = typeOrName;
    if (isScalar(type)) {
      return SCALAR_TYPE_MAP[type.type];
    }

    return nameIt(type.title);
  }

  generateQuery() {
    // mutation or query
    const root = this.tg.types[0] as ObjectNode;
    for (const idx of Object.values(root.properties)) {
      this.#emitObject(this.tg.types[idx] as ObjectNode, {
        asInput: false,
        parentVerdict: "PASS",
        path: [],
      });
    }

    logger.debug(
      `types: ${name} => ${
        Deno.inspect(this.types.map(([n, x]) => resolveRecDebug(x)), {
          depth: 10,
        })
      }`,
    );

    this.types = this.types.map(([k, v]) => {
      return [k, toResolverMap(resolveRecDebug(v)!)];
    });
  }

  #emitEmptyObject() {
    if (this.typesDefined.has("")) {
      return;
    }

    this.#define("", typeEmptyObjectScalar());
  }

  #emitObject(type: ObjectNode, gctx: GenContext) {
    const { asInput } = gctx;
    const title = this.#getName(type, asInput);
    if (this.typesDefined.has(title)) {
      return;
    }

    if (Object.keys(type.properties).length == 0) {
      this.#emitEmptyObject();
      return;
    }

    const fields = asInput ? "inputFields" : "fields";
    this.#define(
      title,
      toResolverMap({
        name: title,
        kind: asInput ? TypeKind.INPUT_OBJECT : TypeKind.OBJECT,
        interfaces: () => [],
        [fields]: Object.entries(type.properties).map(([fieldName, idx]) => {
          const fieldType = this.tg.types[idx];
          const fieldSchema = this.$fieldSchema(fieldName, fieldType, gctx);
          return {
            isDeprecated: () => false,
            args: asInput ? undefined : [], // only on output OBJECT
            ...fieldSchema,
          };
        }),
      } as Record<string, unknown>),
    );
  }

  #emitScalar(type: ScalarNode) {
    const name = this.#getName(type, null);
    if (this.typesDefined.has(name)) {
      return;
    }

    this.#define(
      name,
      toResolverMap({
        kind: TypeKind.SCALAR,
        name,
        description: `${type.type} type`,
      }, true),
    );
  }

  // Only leaf and non wrapper types
  #emitRawType(type: TypeNode, gctx: GenContext) {
    if (gctx.path.includes(type.title)) {
      return;
    }

    gctx.path.push(type.title);

    let ret = null;
    if (isScalar(type)) {
      ret = this.#emitScalar(type);
    } else if (isObject(type)) {
      ret = this.#emitObject(type, gctx);
    } else {
      throw new Error(`Unhandled "${type.type}" of title ${type.title}`);
    }

    gctx.path.pop();
    return ret;
  }

  #emitWrapperAndReturnSchema(
    type: TypeNode,
    gctx: GenContext,
  ): Record<string, Resolver> {
    if (isList(type)) {
      return toResolverMap({
        kind: TypeKind.LIST,
        ofType: this.#emitMaybeWithQuantifierSchema(
          this.tg.types[type.items],
          gctx,
          null,
        ),
      }, true);
    }

    if (isUnion(type) || isEither(type)) {
      return this.#emitUnionAndReturnSchema(type, gctx);
    }

    if (isOptional(type)) {
      // Optional type does not have a wrapper, by default all types are optional
      throw new Error(`Unexpected input optional type "${type.title}"`);
    }

    // std type
    if (!this.typesDefined.has(this.#getName(type, gctx.asInput))) {
      this.#emitRawType(type, gctx);
    }

    const schema = this.$refSchema(this.#getName(type, gctx.asInput));

    return gctx.asInput
      ? toResolverMap({
        kind: TypeKind.NON_NULL,
        ofType: this.$refSchema(this.#getName(type, gctx.asInput)),
      }, true)
      : schema;
  }

  #emitMaybeWithQuantifierSchema(
    type: TypeNode,
    gctx: GenContext,
    fieldName: string | null,
  ): Record<string, Resolver> {
    if (!isOptional(type) || isList(type)) {
      const innerSchema = this.#emitWrapperAndReturnSchema(type, gctx);
      if (fieldName) {
        return toResolverMap({
          name: fieldName,
          type: innerSchema,
        });
      } else {
        return innerSchema;
      }
    }

    // Optional
    const innerType = unwrapOptionalRec(this.tg, type);
    let innerSchema = null;

    if (isList(innerType)) {
      const unwrapInnerType = unwrapOptionalRec(
        this.tg,
        this.tg.types[innerType.items],
      );
      innerSchema = this.#emitWrapperAndReturnSchema(unwrapInnerType, gctx);
    } else if (isUnion(innerType) || isEither(innerType)) {
      innerSchema = this.#emitWrapperAndReturnSchema(innerType, gctx);
    } else {
      this.#emitRawType(innerType, gctx);
      innerSchema = this.$refSchema(this.#getName(innerType, gctx.asInput));
    }

    if (fieldName) {
      return toResolverMap({
        name: fieldName,
        type: innerSchema,
      });
    } else {
      return innerSchema;
    }
  }

  #emitUnionAndReturnSchema(
    type: UnionNode | EitherNode,
    gctx: GenContext,
  ): Record<string, Resolver> {
    const title = this.#getName(type, null);
    const variantIdx = isUnion(type) ? type.anyOf : type.oneOf;
    const variants = variantIdx.map((idx) => this.tg.types[idx]);
    const titles = new Set<string>(
      variants.map((t) => this.#getName(t, null)),
    );
    const description = `${type.type} type\n${Array.from(titles).join(", ")}`;

    if (gctx.asInput || variants.some(isScalar)) {
      // Note: if one item is a scalar
      // might as well create custom scalars for the others
      if (!this.typesDefined.has(title)) {
        const schema = typeGenericCustomScalar(type.title, description);
        this.#define(title, schema);
      }

      return toResolverMap({
        kind: TypeKind.NON_NULL,
        ofType: this.$refSchema(title),
      }, true);
    }

    const outTitle = title + "Out"; // avoids name clash if shared
    const schema = toResolverMap({
      kind: TypeKind.UNION,
      name: title,
      possibleTypes: () => {
        return variants.map((variant) => {
          if (isScalar(variant)) {
            throw new Error(
              "Invalid state: got scalar that should have been handled prior",
            );
          }

          return this.#emitMaybeWithQuantifierSchema(variant, gctx, null);
        });
      },
    }, true);

    if (!this.typesDefined.has(outTitle)) {
      this.#define(outTitle, schema);
    }

    return schema;
  }

  $requiredSchema(schema: Record<string, Resolver>): Record<string, Resolver> {
    return toResolverMap({
      kind: TypeKind.NON_NULL,
      ofType: schema,
    });
  }

  /**
   * * Shape
   * ```gql
   * query {
   *   fieldCase1(arg1: A1, arg2: A2, ..): Output
   *   fieldCase2: Output
   * }
   * ```
   */
  $fieldSchema(
    fieldName: string,
    type: TypeNode,
    gctx: GenContext,
  ): Record<string, Resolver> {
    if (isFunction(type)) {
      const input = this.tg.types[type.input];
      const output = this.tg.types[type.output];

      if (!isObject(input)) {
        throw new Error(
          `Expected Object for input type named "${input.title}", got "${input.type}" instead`,
        );
      }

      const enries = Object.entries(input.properties);
      return toResolverMap({
        name: fieldName,
        interfaces: () => [],
        // input
        args: enries.map(([argName, idx]) => {
          const entry = this.tg.types[idx];
          return this.#emitMaybeWithQuantifierSchema(entry, {
            ...gctx,
            asInput: true,
          }, argName);
        }),

        // Output
        type: this.#emitMaybeWithQuantifierSchema(output, {
          ...gctx,
          asInput: false,
        }, null),
      }, true);
    }

    return this.#emitMaybeWithQuantifierSchema(type, gctx, fieldName);
  }

  $refSchema(name: string): Record<string, Resolver> {
    return toResolverMap({
      name,
      ofType: null,
    }, true);
  }
}

function toResolverMap<T>(
  rec: Record<string, T>,
  addOtherFields?: boolean,
): Record<string, Resolver> {
  const entries = Object.entries(rec).map(([k, v]) => [k, () => v]);
  const ret = Object.fromEntries(entries);
  if (addOtherFields) {
    return { ...fieldCommon(), ...ret };
  }

  return ret;
}

// rm
function resolveRecDebug(rec: any): Record<string, unknown> | null {
  function resolve(value: unknown): unknown {
    while (typeof value === "function") {
      value = (value as () => unknown)();
    }

    if (Array.isArray(value)) {
      return value.map(resolve);
    } else if (typeof value === "object" && value !== null) {
      return resolveRecDebug(value as Record<string, unknown>);
    }

    return value;
  }

  return Object.fromEntries(
    Object.entries(rec).map(([key, value]) => [key, resolve(value)]),
  );
}

function unwrapOptionalRec(tg: TypeGraphDS, type: TypeNode) {
  while (isOptional(type)) {
    type = tg.types[type.item];
  }

  return type;
}
