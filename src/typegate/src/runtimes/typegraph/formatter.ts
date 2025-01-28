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
  type EitherNode,
  isEither,
  isEmptyObject,
  isFunction,
  isList,
  isObject,
  isOptional,
  isScalar,
  isUnion,
  type TypeNode,
  type UnionNode,
} from "../../typegraph/type_node.ts";
import { DeprecatedArg } from "../typegraph.ts";
import { ensure } from "../../utils.ts";
import {
  fieldCommon,
  policyDescription,
  genOutputScalarVariantWrapper,
  typeEmptyObjectScalar,
  typeGenericCustomScalar,
} from "./helpers.ts";
import { Resolver } from "../../types.ts";
import { AllowOrPass, TypeVisibility } from "./visibility.ts";
import { IntrospectionGen } from "./introspection_gen.ts";

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
  verdict: AllowOrPass;
  policies: PolicyIndices[];
};

export class TypeFormatter {
  scalarIndex = new Map<string, number>();

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly visibility: TypeVisibility,
  ) {
    const gen = new IntrospectionGen(this.tg, visibility);
    gen.generateQuery();
  }

  formatInputFields(
    [name, typeIdx]: [string, number],
    verdict: AllowOrPass,
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
        const ret = this.formatType(type, true, true, verdict);
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
    parentVerdict?: AllowOrPass
  ): Record<string, Resolver> => {
    if (isOptional(type)) {
      const subtype = this.tg.types[type.item];
      return this.formatType(subtype, false, asInput, parentVerdict);
    }

    if (required) {
      return {
        ...fieldCommon(),
        kind: () => TypeKind.NON_NULL,
        ofType: () => {
          return this.formatType(type, false, asInput, parentVerdict);
        },
      };
    }

    if (isList(type)) {
      return {
        ...fieldCommon(),
        kind: () => TypeKind.LIST,
        ofType: () => {
          const subtype = this.tg.types[type.items];
          return this.formatType(subtype, true, asInput, parentVerdict);
        },
      };
    }

    if (isScalar(type)) {
      return {
        ...fieldCommon(),
        kind: () => TypeKind.SCALAR,
        name: () => SCALAR_TYPE_MAP[type.type],
        description: () => `${type.type} type`,
      };
    }

    if (isFunction(type)) {
      const output = this.tg.types[type.output as number];
      return this.formatType(output, false, false, parentVerdict);
    }

    if (isObject(type)) {
      if (type.title === "Query" && Object.keys(type.properties).length === 0) {
        return this.#formatEmptyQueryObject(type);
      }
      if (isEmptyObject(type)) {
        return this.formatEmptyObject();
      }

      return this.#formatObject(asInput, type, parentVerdict);
    }

    if (isEither(type) || isUnion(type)) {
      return this.#formatUnionOrEither(asInput, type, parentVerdict);
    }

    throw Error(`unexpected type format ${(type as any).type}`);
    // interface: fields, interfaces, possibleTypes
    // union: possibleTypes
    // enum: enumValues
  };

  #formatField(asInput: boolean, { name, typeIdx, verdict, policies }: FieldInfo) {
    const type = this.tg.types[typeIdx];
    const common = {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L329
      name: () => name,
      description: () => `${name} field${policyDescription(this.tg, policies)}`,
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
          let entries = this.visibility.filterAllowedFields(inp as ObjectNode, verdict);
          entries = entries.sort((a, b) => b[1] - a[1]);
          return entries
            .map(([fieldName, fieldIdx, verdict]) =>
              this.formatInputFields(
                [fieldName, fieldIdx],
                verdict,
                (type.injections ?? {})[fieldName] ?? null,
              )
            )
            .filter((f) => f !== null);
        },
        type: () => {
          const output = this.tg.types[type.output as number];
          return this.formatType(output, true, false, verdict);
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
  }

  #formatEmptyQueryObject(type: ObjectNode) {
    // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
    return {
      ...fieldCommon(),
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

  #formatObject(asInput: boolean, type: ObjectNode, parentVerdict?: AllowOrPass) {
    const fieldsLabel = asInput ? "inputFields" : "fields";
    let entries = this.visibility.filterAllowedFields(type, parentVerdict);
    if (entries.length == 0) {
      return this.formatEmptyObject();
    }

    return {
      ...fieldCommon(),
      kind: () => asInput ? TypeKind.INPUT_OBJECT : TypeKind.OBJECT,
      name: () => asInput ? `${type.title}Inp` : type.title,
      description: () =>
        asInput ? `${type.title} input type` : `${type.title} type`,

      [fieldsLabel]: () => {

        if (!asInput) {
          entries = entries.sort((a, b) => b[1] - a[1]);
        }
        
        return entries.map(([name, typeIdx, verdict]) =>
          this.#formatField(asInput, {
            name,
            typeIdx,
            verdict,
            policies: type.policies?.[name] ?? [],
          })
        );
      },

      interfaces: () => [],
    };
  }

  #formatUnionOrEither(asInput: boolean, type: UnionNode | EitherNode, parentVerdict?: AllowOrPass) {
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
    const variants = isUnion(type) ? type.anyOf : type.oneOf;
    if (asInput) {
      return this.formatUnionEitherOnInput(type);
    } else {
      return {
        ...fieldCommon(),
        kind: () => TypeKind.UNION,
        name: () => `${type.title}Out`,
        description: () => `${type.title} type`,
        possibleTypes: () => {
          return variants.map((idx) => {
            const variant = this.tg.types[idx];
            if (isScalar(variant)) {
              const adhocOutputVariant = genOutputScalarVariantWrapper(variant, idx);
              // allow since the fields are adhoc
              return this.formatType(adhocOutputVariant, false, false, "ALLOW");
            } else {
              return this.formatType(variant, false, false, parentVerdict);
            }
          });
        },
      };
    }
  }

  emittedCustomScalars: Map<string, ReturnType<typeof typeEmptyObjectScalar> | ReturnType<typeof typeGenericCustomScalar> > = new Map();

  formatUnionEitherOnInput(type: EitherNode | UnionNode) {
    const variants = isUnion(type) ? type.anyOf : type.oneOf;
    const titles = new Set<string>(
      variants.map((idx) => this.tg.types[idx].title),
    );
    const description = `${type.type} type\n${
      Array.from(titles).join(", ")
    }`;

    const unionEitherInput = typeGenericCustomScalar(type.title, description);
    this.emittedCustomScalars.set(type.title, unionEitherInput);
    return unionEitherInput;
  }

  formatEmptyObject() {
    const emptyObjScalar = typeEmptyObjectScalar();
    this.emittedCustomScalars.set("_", emptyObjScalar);
    return emptyObjScalar;
  }
}
