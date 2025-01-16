// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeKind } from "graphql";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import {
  InjectionNode,
  ObjectNode,
  PolicyIndices,
} from "../../typegraph/types.ts";
import {
  isEither,
  isEmptyObject,
  isFunction,
  isList,
  isObject,
  isOptional,
  isScalar,
  isUnion,
  type TypeNode,
} from "../../typegraph/type_node.ts";
import { DeprecatedArg } from "../typegraph.ts";
import { ensure } from "../../utils.ts";
import {
  policyDescription,
  typeCustomScalar,
  typeEmptyObjectScalar,
} from "./helpers.ts";

const SCALAR_TYPE_MAP = {
  boolean: "Boolean",
  integer: "Int",
  float: "Float",
  string: "String",
  file: "File",
};

type FieldInfo = {
  name: string;
  typeIdx: number;
  policies: PolicyIndices[];
};

export class TypeFormatter {
  scalarIndex = new Map<string, number>();
  constructor(private tg: TypeGraphDS) {}

  formatInputFields(
    [name, typeIdx]: [string, number],
    injectionNode: InjectionNode | null,
  ) {
    const type = this.tg.types[typeIdx];

    // TODO resolve quantifiers

    if (injectionNode && ("injection" in injectionNode)) {
      // FIXME MET-704
      return null;
    }

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L374
      name: () => name,
      description: () => `${name} input field`,
      type: () => {
        const ret = this.formatType(type, true, true);
        return ret;
      },
      defaultValue: () => null,
      isDeprecated: () => false,
      deprecationReason: () => null,
    };
  }

  formatType = (
    type: TypeNode,
    required: boolean,
    asInput: boolean,
  ): Record<string, () => unknown> => {
    const common = {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L207
      name: () => null,
      specifiedByURL: () => null,
      // logic at https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L453-L490
      ofType: () => null,
      inputFields: () => null,
      fields: () => null,
      interfaces: () => null,
      possibleTypes: () => null,
      enumValues: () => null,
    };

    if (isOptional(type)) {
      const subtype = this.tg.types[type.item];
      return this.formatType(subtype, false, asInput);
    }

    if (required) {
      return {
        ...common,
        kind: () => TypeKind.NON_NULL,
        ofType: () => {
          return this.formatType(type, false, asInput);
        },
      };
    }

    if (isList(type)) {
      return {
        ...common,
        kind: () => TypeKind.LIST,
        ofType: () => {
          const subtype = this.tg.types[type.items];
          return this.formatType(subtype, true, asInput);
        },
      };
    }

    if (isScalar(type)) {
      return {
        ...common,
        kind: () => TypeKind.SCALAR,
        name: () => SCALAR_TYPE_MAP[type.type],
        description: () => `${type.type} type`,
      };
    }

    if (isFunction(type)) {
      const output = this.tg.types[type.output as number];
      return this.formatType(output, false, false);
    }

    if (isObject(type)) {
      if (type.title === "Query" && Object.keys(type.properties).length === 0) {
        // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
        return {
          ...common,
          kind: () => TypeKind.OBJECT,
          name: () => "Query",
          description: () => `${type.title} type`,
          fields: () => [
            {
              name: () => "_",
              args: () => [],
              type: () =>
                this.formatType(
                  this.tg.types[
                    (this.tg.types[0] as ObjectNode).properties["query"]
                  ], // itself
                  false,
                  false,
                ),
              isDeprecated: () => true,
              deprecationReason: () =>
                "Dummy value due to https://github.com/graphql/graphiql/issues/2308",
            },
          ],
          interfaces: () => [],
        };
      }

      if (isEmptyObject(type)) {
        return typeEmptyObjectScalar();
      }

      if (asInput) {
        return {
          ...common,
          kind: () => TypeKind.INPUT_OBJECT,
          name: () => `${type.title}Inp`,
          description: () => `${type.title} input type`,
          inputFields: () => {
            return Object.entries(type.properties).map(([name, typeIdx]) =>
              this.formatField(true)({
                name,
                typeIdx,
                policies: type.policies?.[name] ?? [],
              })
            );
          },
          interfaces: () => [],
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.OBJECT,
          name: () => type.title,
          description: () => `${type.title} type`,
          fields: () => {
            let entries = Object.entries(type.properties);
            entries = entries.sort((a, b) => b[1] - a[1]);
            return entries.map(([name, typeIdx]) =>
              this.formatField(false)({
                name,
                typeIdx,
                policies: type.policies?.[name] ?? [],
              })
            );
          },
          interfaces: () => [],
        };
      }
    }

    // Issue:
    // Translate union (anyOf) / either (oneOf) to Graphql types that behave the same way
    // - Current graphql spec does not allow UNION types on the input (yet)
    // - UNION types does not support scalars, only objects
    // Current solution:
    // - input: translate either/union nodes to a custom scalar
    // - output: translate either/union nodes to graphql UNION
    //  * caveat: since UNION does not allow scalar variants, we have to translate them
    //    to custom graphql objects
    // Alternative ?
    // https://github.com/graphql/graphql-spec/pull/825
    if (isEither(type) || isUnion(type)) {
      const variants = isUnion(type) ? type.anyOf : type.oneOf;
      if (asInput) {
        const titles = new Set<string>(
          variants.map((idx) => this.tg.types[idx].title),
        );
        const description = `${type.type} type\n${
          Array.from(titles).join(
            ", ",
          )
        }`;

        return {
          ...common,
          kind: () => TypeKind.SCALAR,
          name: () => `${type.title}In`,
          description: () => description,
        };
      } else {
        return {
          ...common,
          kind: () => TypeKind.UNION,
          name: () => `${type.title}Out`,
          description: () => `${type.title} type`,
          possibleTypes: () => {
            return variants.map((idx) => {
              const variant = this.tg.types[idx];
              if (isScalar(variant)) {
                const idx = this.scalarIndex.get(variant.type)!;
                const asObject = typeCustomScalar(variant, idx);
                return this.formatType(asObject, false, false);
              } else {
                return this.formatType(variant, false, false);
              }
            });
          },
        };
      }
    }

    throw Error(`unexpected type format ${(type as any).type}`);
    // interface: fields, interfaces, possibleTypes
    // union: possibleTypes
    // enum: enumValues
  };

  formatField =
    (asInput: boolean) => ({ name, typeIdx, policies }: FieldInfo) => {
      const type = this.tg.types[typeIdx];
      const common = {
        // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L329
        name: () => name,
        description: () =>
          `${name} field${policyDescription(this.tg, policies)}`,
        isDeprecated: () => false,
        deprecationReason: () => null,
      };

      if (isFunction(type)) {
        return {
          ...common,
          args: (_: DeprecatedArg = {}) => {
            const inp = this.tg.types[type.input as number];
            ensure(
              isObject(inp),
              `${type} cannot be an input field, require struct`,
            );
            let entries = Object.entries((inp as ObjectNode).properties);
            entries = entries.sort((a, b) => b[1] - a[1]);
            return entries
              .map((entry) =>
                this.formatInputFields(
                  entry,
                  (type.injections ?? {})[entry[0]] ?? null,
                )
              )
              .filter((f) => f !== null);
          },
          type: () => {
            const output = this.tg.types[type.output as number];
            return this.formatType(output, true, false);
          },
        };
      }

      return {
        ...common,
        args: () => [],
        type: () => {
          return this.formatType(type, true, asInput);
        },
      };
    };
}
