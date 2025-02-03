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
import { AllowOrPass, LocalFieldTuple } from "./visibility.ts";
import { TypeVisibility } from "./visibility.ts";
import {
  fieldCommon,
  policyDescription,
  typeEmptyObjectScalar,
  typeGenericCustomScalar,
} from "./helpers.ts";
import { TypeKind } from "graphql";
import { Resolver } from "../../types.ts";
import { getLogger } from "../../log.ts";
import { FunctionNode } from "../../typegraph/type_node.ts";
import { ensure } from "../../utils.ts";

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

export class IntrospectionTypeEmitter {
  #types: Array<[string, Record<string, Resolver>]>;
  #typesDefined: Set<string>;

  constructor(private tg: TypeGraphDS, private visibility?: TypeVisibility) {
    this.#types = [];
    this.#typesDefined = new Set();
  }

  reset() {
    this.#types = [];
    this.#typesDefined = new Set();
  }

  getTypes() {
    return this.#types.map(([_, res]) => res);
  }

  findType(reqName: string) {
    return this.#types.find(([name, _]) => name == reqName)?.[1] ?? null;
  }

  findTypeOrError(name: string) {
    const schema = this.findType(name);
    if (schema) {
      return schema;
    }

    throw new Error(`GraphQL type "${name}" not defined yet`);
  }

  getRootSchema(rootKind: "Mutation" | "Query") {
    const tup = this.#types.find(([name, _]) => name == rootKind);
    return tup ? tup[1] : null;
  }

  #define(name: string, schema: Record<string, Resolver>) {
    if (this.#typesDefined.has(name)) {
      throw new Error(`Already emitted type of name ${name}`);
    }

    // logger.debug(`Emitted: ${name} => ${Deno.inspect(schema)}`);
    logger.debug(`Emitted: ${name}`);
    this.#types.push([name, schema]);
    this.#typesDefined.add(name);
  }

  #getName(type: TypeNode, gctx: GenContext) {
    const nameIt = (title: string) =>
      `${title}${gctx.asInput ? title + "_Inp" : ""}`;

    if (isScalar(type)) {
      return SCALAR_TYPE_MAP[type.type];
    }

    if (isObject(type)) {
      const { adhocId } = this.#filterWithInjectionAnPolicies(
        type,
        gctx,
        null,
        false,
      );

      return nameIt(
        isRootQueryObject(type) ? type.title : `${type.title}${adhocId}`,
      );
    }

    return nameIt(type.title);
  }

  /** mutation and query */
  emitRoot() {
    const root = this.tg.types[0] as ObjectNode;

    for (const idx of Object.values(root.properties)) {
      this.#emitObject(this.tg.types[idx] as ObjectNode, {
        asInput: false,
        parentVerdict: "PASS",
        path: [],
      });
    }

    // logger.debug(
    //   `types: ${name} => ${
    //     Deno.inspect(this.#types.map(([n, x]) => resolveRec(x)), {
    //       depth: 10,
    //     })
    //   }`,
    // );

    this.#types = this.#types.map(([k, v]) => {
      return [k, toResolverMap(resolveRec(v)!)];
    });
  }

  /** Filter according to the injections and pre-computed policies */
  #filterWithInjectionAnPolicies(
    type: ObjectNode,
    gctx: GenContext,
    parentFunction: FunctionNode | null,
    sortFields: boolean,
  ) {
    const originalEntries = Object.entries(type.properties);
    let entries = null;

    // Policies
    if (this.visibility && gctx.parentVerdict == "PASS") {
      entries = this.visibility.filterAllowedFields(type, gctx.parentVerdict);
    } else {
      entries = originalEntries.map(([k, idx]) =>
        [k, idx, "PASS"] satisfies LocalFieldTuple
      );
    }

    // Injections
    entries = entries.map(([fieldName, idx, verdict]) => {
      const injectionNode = (parentFunction?.injections ?? {})?.[fieldName] ??
        null;
      if (injectionNode && ("injection" in injectionNode)) {
        // FIXME MET-704
        // FIXME: collect information on visibilty
        return null;
      }

      return [fieldName, this.tg.types[idx], verdict] satisfies [
        string,
        TypeNode,
        AllowOrPass,
      ];
    }).filter((r) => r != null);

    if (sortFields) {
      entries = entries.sort(([f1], [f2]) => f1.localeCompare(f2));
    }

    return {
      // Note: this is arbitrary, injections and policies will reduce the field
      // thus making a completely different type
      adhocId: originalEntries.length == entries.length
        ? ""
        : `_f${entries.length == 0 ? "empty" : entries.length}`,
      entries,
    };
  }

  #emitNamedEmptyObject(name: string) {
    if (this.#typesDefined.has(name)) {
      return;
    }

    this.#define(name, typeEmptyObjectScalar(name));
  }

  #emitObject(type: ObjectNode, gctx: GenContext) {
    const { asInput } = gctx;
    const { entries } = this.#filterWithInjectionAnPolicies(
      type,
      gctx,
      null,
      false,
    );
    const title = this.#getName(type, gctx);

    if (this.#typesDefined.has(title)) {
      return;
    }

    if (entries.length == 0) {
      if (type.title == "Query") {
        const schema = this.$emptyQuerySchema(type);
        this.#define(type.title, schema);
      } else {
        this.#emitNamedEmptyObject(title);
      }

      return;
    }

    const fields = asInput ? "inputFields" : "fields";
    const description = asInput ? `${title} input field` : `${title} field`;
    this.#define(
      title,
      toResolverMap({
        name: title,
        kind: asInput ? TypeKind.INPUT_OBJECT : TypeKind.OBJECT,
        interfaces: [],
        [fields]: entries.map(([fieldName, fieldType, verdict]) => {
          const policies = (type.policies ?? {})[fieldName];
          const polDescription = policyDescription(this.tg, policies ?? []);

          return {
            isDeprecated: false,
            args: asInput ? undefined : [], // only on output OBJECT
            description: description + polDescription,
            ...this.$fieldSchema(fieldName, fieldType, {
              ...gctx,
              parentVerdict: verdict,
            }),
          };
        }),
      } as Record<string, unknown>),
    );
  }

  #emitScalar(type: ScalarNode, gctx: GenContext) {
    const name = this.#getName(type, gctx);
    if (this.#typesDefined.has(name)) {
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
      ret = this.#emitScalar(type, gctx);
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
    if (!this.#typesDefined.has(this.#getName(type, gctx))) {
      this.#emitRawType(type, gctx);
    }

    const schema = this.$refSchema(this.#getName(type, gctx));

    return gctx.asInput
      ? toResolverMap({
        kind: TypeKind.NON_NULL,
        ofType: this.$refSchema(this.#getName(type, gctx)),
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

    if (isList(innerType) || isUnion(innerType) || isEither(innerType)) {
      innerSchema = this.#emitWrapperAndReturnSchema(innerType, gctx);
    } else {
      this.#emitRawType(innerType, gctx);
      innerSchema = this.$refSchema(this.#getName(innerType, gctx));
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
    const title = this.#getName(type, { ...gctx, asInput: false });
    const variantIdx = isUnion(type) ? type.anyOf : type.oneOf;
    const variants = variantIdx.map((idx) => this.tg.types[idx]);
    const titles = new Set<string>(
      variants.map((t) => this.#getName(t, { ...gctx, asInput: false })),
    );
    const description = `${type.type} type\n${Array.from(titles).join(", ")}`;

    if (gctx.asInput || variants.some(isScalar)) {
      console.log("INPUT", title, gctx.asInput || variants.some(isScalar));
      // Note: if one item is a scalar
      // might as well create custom scalars for the others
      if (!this.#typesDefined.has(title)) {
        const schema = typeGenericCustomScalar(title, description);
        this.#define(title, schema);
      }

      return toResolverMap({
        kind: TypeKind.NON_NULL,
        ofType: this.$refSchema(title),
      }, true);
    }

    // Output type
    const { adhocId, possibleTypes } = this.#emitPossibleTypesAndReturnSchema(
      variants,
      gctx,
    );

    // title is reserved for the input scalar version
    const outTitle = `${title}_of_${adhocId}`;
    const schema = toResolverMap({
      kind: TypeKind.UNION,
      name: outTitle,
      possibleTypes,
    }, true);

    if (!this.#typesDefined.has(outTitle)) {
      this.#define(outTitle, schema);
    }

    return this.$refSchema(outTitle);
  }

  #emitPossibleTypesAndReturnSchema(
    variants: Array<TypeNode>,
    gctx: GenContext,
  ) {
    if (gctx.asInput) {
      throw new Error(
        "Unexpected use of possibleTypes schema as an input type",
      );
    }

    const possibleTypes = [];
    const variantNames = [];
    for (const variant of variants) {
      if (isScalar(variant)) {
        // Scalar as union variant are not supported on the output, even custom ones
        throw new Error("Encounted scalar that should have been handled prior");
      }

      // Note: this can still emit empty an object scalar
      const refSchema = this.#emitMaybeWithQuantifierSchema(
        variant,
        gctx,
        null,
      );

      // Handle case when we emit an empty scalar that represents an empty field object
      const typeName = getSchemaName(refSchema);
      variantNames.push(typeName);

      const definition = this.findTypeOrError(typeName);
      const defKind = definition?.kind({} as any);
      if (defKind == TypeKind.SCALAR) {
        // Make up a new object
        const adhocTitle = `_variant_empty_${variant.title}`;
        if (!this.#typesDefined.has(adhocTitle)) {
          this.#define(adhocTitle, this.$emptyAdhocObjectSchema(adhocTitle));
        }

        possibleTypes.push(this.$refSchema(adhocTitle));
        continue;
      }

      possibleTypes.push(refSchema);
    }

    return {
      // the underlying names are shape dependent if some fields are omitted
      adhocId: variantNames.join("_"),
      possibleTypes,
    };
  }

  $requiredSchema(schema: Record<string, Resolver>): Record<string, Resolver> {
    return toResolverMap({
      kind: TypeKind.NON_NULL,
      ofType: schema,
    });
  }

  /**
   * Get the schema for a field (either a simple field or a function field)
   * and emit required types along the way.
   *
   * * Shape
   * ```gql
   * query {
   *   fieldCase1_Simple: Output
   *   fieldCase2_Func(arg1: A1, arg2: A2, ..): Output
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

      const { entries: inputEntries } = this.#filterWithInjectionAnPolicies(
        input,
        gctx,
        type,
        true,
      );

      return toResolverMap({
        name: fieldName,
        interfaces: [],
        // input
        args: inputEntries.map(([argName, argType, verdict]) => {
          const argSchema = this.#emitMaybeWithQuantifierSchema(argType, {
            ...gctx,
            asInput: true,
            parentVerdict: verdict,
          }, argName);

          return {
            description: `${fieldName} argument`,
            ...argSchema,
          };
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

  /** Reference to a supposedly defined type */
  $refSchema(name: string): Record<string, Resolver> {
    return toResolverMap({
      name,
      ofType: null,
    }, true);
  }

  /** Adhoc empty object placeholder for empty `Query` and `Mutation` */
  $emptyQuerySchema(type: ObjectNode) {
    // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
    ensure(
      isRootQueryObject(type),
      "Mutation or Query expected",
    );
    return this.$emptyAdhocObjectSchema(type.title);
  }

  /**
   * ```gql
   * type Title {
   *   _: Title
   * }
   * ```
   */
  $emptyAdhocObjectSchema(title: string) {
    return toResolverMap({
      kind: TypeKind.OBJECT,
      name: title,
      description: `${title} type`,
      fields: [
        {
          name: "_",
          args: [],
          type: this.$refSchema(title), // itself
          isDeprecated: true,
          deprecationReason:
            "Dummy value due to https://github.com/graphql/graphiql/issues/2308",
        },
      ],
    }, true);
  }
}

function toResolverMap<T>(
  rec: Record<string, T>,
  addOtherFields?: boolean,
): Record<string, Resolver> {
  const entries = Object.entries(rec).map((
    [k, v],
  ) => [k, typeof v == "function" ? v : () => v]);
  const ret = Object.fromEntries(entries);
  if (addOtherFields) {
    return { ...fieldCommon(), ...ret };
  }

  return ret;
}

// rm
function resolveRec(rec: any): Record<string, unknown> | null {
  function resolve(value: unknown): unknown {
    while (typeof value === "function") {
      value = (value as () => unknown)();
    }

    if (Array.isArray(value)) {
      return value.map(resolve);
    } else if (typeof value === "object" && value !== null) {
      return resolveRec(value as Record<string, unknown>);
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

function getSchemaName(schemaRes: Record<string, Resolver>) {
  let schema = resolveRec(schemaRes);

  let name = null;
  if (schema?.ofType) {
    schema = schema.ofType as Record<string, unknown>;
  }

  name = schema?.name;

  ensure(name != null, `Bad schema: ofType.name or name are undefined`);
  ensure(typeof name == "string", "Schema name is not a string");

  return name as string;
}

function isRootQueryObject(type: ObjectNode) {
  return type.title == "Mutation" || type.title == "Query";
}
