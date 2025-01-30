// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeGraphDS } from "../../typegraph/mod.ts";
import {
  EitherNode,
  isEither,
  ScalarNode,
  isFunction,
  isList,
  isObject,
  isOptional,
  isScalar,
  isUnion,
  ObjectNode,
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
}

const logger = getLogger("introspection_gen");

export class IntrospectionGen {
  types: Array<[string, Record<string, Resolver>]>;
  typesSeen: Set<string>;

  constructor(private tg: TypeGraphDS, private visibility: TypeVisibility) {
    this.types = [];
    this.typesSeen = new Set();
  }

  #define(name: string, schema: Record<string, Resolver>) {
    logger.debug(`Emitted: ${name} => ${Deno.inspect(schema)}`);
    this.types.push([name, schema]);
    this.typesSeen.add(name);
  }

  #seenOrPush(key: string) {
    if (this.typesSeen.has(key)) {
      return true;
    } else {
      this.typesSeen.add(key);
      return false;
    }
  }

  #getName(type: TypeNode, asInput?: boolean) {
    if (isScalar(type)) {
      return SCALAR_TYPE_MAP[type.type];
    }

    return asInput ? `${type.title}_Inp` : type.title;
  }

  generateQuery() {
    // mutation or query
    const root = this.tg.types[0] as ObjectNode;
    for (const idx of Object.values(root.properties)) {
      this.#emitObject(this.tg.types[idx] as ObjectNode, {
        asInput: false,
        parentVerdict: "PASS",
      });
    }

    logger.debug(`types: ${name} => ${Deno.inspect(this.types.map(([n, x]) => resolveRecDebug(x)), {
      depth: 10
    })}`);


    this.types = this.types.map(([k, v]) => {
      return [k, toResolverMap(resolveRecDebug(v)!)]
    })
  }

  #emitEmptyObject() {
    if (this.#seenOrPush("")) {
      return;
    }

    this.#define("", typeEmptyObjectScalar());
  }

  #emitObject(type: ObjectNode, gctx: GenContext) {
    const { asInput } = gctx;
    const title = this.#getName(type, asInput);
    if (this.#seenOrPush(title)) {
      return;
    }

    if (Object.keys(type.properties).length == 0) {
      this.#emitEmptyObject();
      return;
    }

    const fields = asInput ? "inputFields" : "fields";
    this.#define(title, toResolverMap({
      name: title,
      kind: asInput ? TypeKind.INPUT_OBJECT : TypeKind.OBJECT,
      interfaces: () => [],
      [fields]: Object.entries(type.properties).map(([fieldName, idx]) => {
        const fieldType = this.tg.types[idx];
        return {
          isDeprecated: () => false,
          ...this.$fieldSchema(fieldName, fieldType, gctx)
        };
      }),
    } as Record<string, unknown>));
  }

  #emitScalar(type: ScalarNode) {
    if (this.#seenOrPush(type.type)) {
      return;
    }

    this.#define(this.#getName(type), {
      ...fieldCommon(),
      kind: () => TypeKind.SCALAR,
      name: () => SCALAR_TYPE_MAP[type.type],
      description: () => `${type.type} type`,
    });
  }

  // Only leaf types
  // Root types are always of type Object or Scalars
  #emitType(type: TypeNode, gctx: GenContext) {
    if (isScalar(type)) {
      this.#emitScalar(type);
    } else if (isObject(type)) {
      // must come from args right??? but why
      this.#emitObject(type, gctx);
    } else if (isUnion(type) || isEither(type)) {
      const variantIdx = isUnion(type) ? type.anyOf : type.oneOf;
      if (gctx.asInput) {
        this.#emitUnionEitherInput(type);
      } else {
        for (const idx of variantIdx) {
          const variant = this.tg.types[idx];
          this.#emitType(variant, gctx);
        }
      }
    } else {
      throw new Error(`Unhandled "${type.type}" of title ${type.title}`);
    }
  }


  #emitWrapperAndReturnSchema(
    type: TypeNode,
    gctx: GenContext,
  ): Record<string, Resolver> {
    if (isList(type)) {
      return toResolverMap({
        kind: TypeKind.LIST,
        ofType: this.#emitWrapperAndReturnSchema(
          this.tg.types[type.items],
          gctx,
        ),
      }, true);
    }

    if (isOptional(type)) {
      throw new Error(`Unexpected input optional type "${type.title}"`);
    }

    // std type
    this.#emitType(type, gctx);

    return toResolverMap({
      kind: TypeKind.NON_NULL,
      ofType: this.$refSchema(this.#getName(type, gctx.asInput)),
    }, true);
  }

  // Output and object fields must pass through this
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
    const innerType = this.tg.types[type.item];
    let innerSchema = this.$refSchema(this.#getName(type, gctx.asInput));

    if (isList(innerType)) {
      innerSchema =  this.#emitWrapperAndReturnSchema(innerType, gctx);
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

  #emitUnionEitherInput(type: UnionNode | EitherNode) {
    const title = `${type.title}_${type.type}`;
    if (this.#seenOrPush(title)) {
      return;
    }

    const variants = isUnion(type) ? type.anyOf : type.oneOf;

    const titles = new Set<string>(
      variants.map((idx) => this.tg.types[idx].title),
    );

    const description = `${type.type} type\n${Array.from(titles).join(", ")}`;

    const schema = typeGenericCustomScalar(type.title, description);
    this.#define(title, schema);
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
          return this.#emitMaybeWithQuantifierSchema(entry, {...gctx, asInput: true}, argName);
        }),

        // Output
        type: this.#emitMaybeWithQuantifierSchema(output, {...gctx, asInput: false}, null),
      }, true);
    }

    console.log("field", fieldName, type);
    return this.#emitMaybeWithQuantifierSchema(type, gctx, fieldName);
  }

  // Only on leaf
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
      return value.map(resolve)
    } else if (typeof value === "object" && value !== null) {
      return resolveRecDebug(value as Record<string, unknown>);
    }

    return value;
  }

  return Object.fromEntries(
    Object.entries(rec).map(([key, value]) => [key, resolve(value)]),
  );
}
