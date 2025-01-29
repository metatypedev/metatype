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
import { Resolver, ResolverArgs } from "../../types.ts";
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

type Schema = Record<string, Record<string, Resolver>>;
const logger = getLogger("introspection_gen");

export class IntrospectionGen {
  types: Array<[string, Schema]>;
  names: Map<string, number>;

  constructor(private tg: TypeGraphDS, private visibility: TypeVisibility) {
    this.types = [];
    this.names = new Map();
  }

  #define(name: string, schema: Record<string, Resolver>) {
    // logger.debug(`Emitted: ${name} => ${Deno.inspect(schema)}`);
    this.types.push([name, schema]);
  }

  nextName(name: string) {
    const counter = this.names.get(name);
    if (counter === undefined) {
      this.names.set(name, 1);
      return name;
    }

    this.names.set(name, counter + 1);
    return `${name}_${counter}`;
  }

  generateQuery() {
    const root = this.tg.types[0] as ObjectNode;
    this.#emitObject(root, {
      asInput: false,
      parentVerdict: "PASS",
    });

    console.log(this.types.map(([n, x]) => resolveRecDebug(x)));
  }

  #emitEmptyObject() {
    this.#define("", typeEmptyObjectScalar());
  }

  #emitObject(type: ObjectNode, gctx: GenContext) {
    if (Object.keys(type.properties).length == 0) {
      this.#emitEmptyObject();
      return;
    }

    const { asInput } = gctx;
    const fields = asInput ? "inputFields" : "fields";
    const schema = {
      name: `${type.title}${asInput ? "Inp" : ""}`,
      kind: asInput ? TypeKind.INPUT_OBJECT : TypeKind.OBJECT,
      [fields]: Object.entries(type.properties).map(([fieldName, idx]) => {
        const fieldType = this.tg.types[idx];
        return this.$fieldSchema(fieldName, fieldType, gctx);
      }),
    } as Record<string, unknown>;

    this.#define(schema.name as string, toResolverMap(schema));
  }

  // Only leaf types
  // Root types are always of type Object or Scalars
  #emitType(type: TypeNode, gctx: GenContext) {
    if (isScalar(type)) {
      const schema = {
        ...fieldCommon(),
        kind: () => TypeKind.SCALAR,
        name: () => SCALAR_TYPE_MAP[type.type],
        description: () => `${type.type} type`,
      };
      this.#define(type.type, schema);
    } else if (isObject(type)) {
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
      ofType: this.$refSchema(type.title),
    }, true);
  }

  // Output and object fields must pass through this
  #emitMaybeWithQuantifierSchema(
    type: TypeNode,
    gctx: GenContext,
    fieldName: string | null,
  ) {
    if (!isOptional(type) || isList(type)) {
      const innerSchema = this.#emitWrapperAndReturnSchema(type, gctx);
      if (fieldName) {
        return toResolverMap({
          name,
          type: innerSchema,
        });
      } else {
        return innerSchema;
      }
    }

    // Optional
    const optType = this.tg.types[type.item];
    const innerSchema = this.$refSchema(optType.title);
    if (fieldName) {
      return toResolverMap({
        name,
        type: innerSchema,
      });
    } else {
      return innerSchema;
    }
  }

  #emitUnionEitherInput(type: UnionNode | EitherNode) {
    const variants = isUnion(type) ? type.anyOf : type.oneOf;

    const titles = new Set<string>(
      variants.map((idx) => this.tg.types[idx].title),
    );

    const description = `${type.type} type\n${Array.from(titles).join(", ")}`;

    const schema = typeGenericCustomScalar(type.title, description);
    this.#define(type.title, schema);
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
        // input
        args: enries.map(([name, idx]) => {
          const entry = this.tg.types[idx];
          return this.#emitMaybeWithQuantifierSchema(entry, gctx, name);
        }),

        // Output
        type: this.#emitMaybeWithQuantifierSchema(output, gctx, null),
      }, true);
    }

    console.log("field", fieldName, type);
    return this.#emitMaybeWithQuantifierSchema(type, gctx, null);
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

function resolveRecDebug(rec: any): Record<string, unknown> {
  const entries = [] as Array<[string, unknown]>;
  for (const k of Object.keys(rec)) {
    const input = {} as ResolverArgs<unknown>;
    if (typeof rec[k] == "object" && rec[k] != null) {
      entries.push([k, resolveRecDebug(rec[k])]);
    } else if (typeof rec[k] == "function") {
      let val = rec[k](input);
      while (typeof val == "function") {
        console.log("resolve");
        val = val(input);
      }
      entries.push([k, val]);
    } else if (Array.isArray(rec[k])) {
      entries.push([k, rec[k].map(resolveRecDebug)]);
    } else {
      entries.push([k, rec[k]]);
    }
  }

  return Object.fromEntries(entries);
}
