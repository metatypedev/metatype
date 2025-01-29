// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeGraphDS } from "../../typegraph/mod.ts";
import {
  FunctionNode,
  isFunction,
  isList,
  isObject,
  isOptional,
  isScalar,
  ListNode,
  ObjectNode,
  Type,
  TypeNode,
} from "../../typegraph/type_node.ts";
import { AllowOrPass } from "./visibility.ts";
import { TypeVisibility } from "./visibility.ts";
import { fieldCommon, typeEmptyObjectScalar } from "./helpers.ts";
import { TypeKind } from "graphql";
import { isType } from "graphql";
import { Resolver } from "../../types.ts";

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
  isOptional?: boolean;
}

type Schema = Record<string, unknown>;

export class IntrospectionGen {
  types: Array<[string, Schema]>;
  names: Map<string, number>;

  constructor(private tg: TypeGraphDS, private visibility: TypeVisibility) {
    this.types = [];
    this.names = new Map();
  }

  #define(name: string, schema: Record<string, unknown>) {
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
  }

  #emitEmptyObject() {
    this.#define("", typeEmptyObjectScalar());
  }

  #emitFunction(type: FunctionNode, gctx: GenContext) {
    const input = this.tg.types[type.input];
    const output = this.tg.types[type.output];

    this.#emitType(input, {
      ...gctx,
      asInput: true,
    });
    this.#emitType(output, {
      ...gctx,
      asInput: false,
    });
  }

  #emitObject(type: ObjectNode, gctx: GenContext) {
    if (Object.keys(type.properties).length == 0) {
      this.#emitEmptyObject();
      return;
    }

    const { asInput, isOptional } = gctx;
    const fields = asInput ? "fields" : "inputFields";
    const schema = {
      name: `${type.title}${asInput ? "Inp" : ""}`,
      kind: isOptional ? TypeKind.NON_NULL : TypeKind.OBJECT,
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
    } else if (isFunction(type)) {
      this.#emitFunction(type, gctx);
    } else if (isObject(type)) {
      this.#emitObject(type, gctx);
    } else if (isList(type) || isOptional(type)) {
      // type Example {
      //   field: [Whatever] # optinoal list
      // }
      //
      // type Field = [Whatever] # unsupported

      throw new Error(
        `Unreasonable call, type with quantifier only expected on an object field`,
      );
    } else {
      throw new Error(`Unhandled "${type.type}"`);
    }
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
  $fieldSchema(fieldName: string, type: TypeNode, gctx: GenContext) {
    if (isFunction(type)) {
      const input = this.tg.types[type.input];
      const output = this.tg.types[type.output];
      if (!isObject(input)) {
        throw new Error(
          `Expected Object for input type named "${input.title}", got "${input.type}" instead`,
        );
      }

      this.#emitType(output, gctx);

      const enries = Object.entries(input.properties);
      return toResolverMap({
        name: fieldName,
        args: enries.map(([name, idx]) => {
          const entry = this.tg.types[idx];
          this.#emitType(entry, gctx);

          return {
            name,
            type: this.$refSchema(entry.title, entry.type),
          };
        }),
        // output
        type: this.$refSchema(output.title, output.type),
      }, true);
    }

    this.#emitType(type, gctx);
    return toResolverMap({
      name: fieldName,
      args: [],
      type: this.$refSchema(type.title, type.type),
    }, true);
  }

  // Only on leaf
  $refSchema(name: string, kind: unknown) {
    return {
      kind: () => kind,
      name: () => name,
      ofType: null,
    };
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
