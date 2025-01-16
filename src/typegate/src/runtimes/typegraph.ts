// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  TypeGraph,
  type TypeGraphDS,
  type TypeMaterializer,
} from "../typegraph/mod.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import {
  isEither,
  isEmptyObject,
  isQuantifier,
  isScalar,
  isUnion,
  type ObjectNode,
  Type,
  type TypeNode,
} from "../typegraph/type_node.ts";
import type { Resolver } from "../types.ts";
import {
  getChildTypes,
  type TypeVisitorMap,
  visitTypes,
} from "../typegraph/visitor.ts";
import { distinctBy } from "@std/collections/distinct-by";
import { isInjected } from "../typegraph/utils.ts";
import type { InjectionNode } from "../typegraph/types.ts";
import { TypeFormatter } from "./typegraph/formatter.ts";
import {
  typeCustomScalar,
  typeEmptyObjectScalar,
} from "./typegraph/helpers.ts";

export type DeprecatedArg = { includeDeprecated?: boolean };

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;
  formatter: TypeFormatter;

  private constructor(tg: TypeGraphDS) {
    super(TypeGraph.formatName(tg));
    this.tg = tg;
    this.formatter = new TypeFormatter(tg);
  }

  static init(
    typegraph: TypeGraphDS,
    _materializers: TypeMaterializer[],
    _args: Record<string, unknown>,
  ): Runtime {
    return new TypeGraphRuntime(typegraph);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const resolver = this.#delegate(stage);
    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  #delegate(stage: ComputeStage): Resolver {
    const name = stage.props.materializer?.name;
    switch (name) {
      case "getSchema":
        return this.#getSchemaResolver;
      case "getType":
        return this.#getTypeResolver;
      case "resolver":
        return async ({ _: { parent } }) => {
          const resolver = parent[stage.props.node];
          const ret = typeof resolver === "function"
            ? await resolver()
            : resolver;
          return ret;
        };
      default:
        return async ({ _: { parent } }) => {
          const resolver = parent[stage.props.node];
          const ret = typeof resolver === "function"
            ? await resolver()
            : resolver;
          return ret;
        };
    }
  }

  #getSchemaResolver: Resolver = () => {
    const root = this.tg.types[0] as ObjectNode;

    const queries = this.tg.types[root.properties["query"]] as ObjectNode;
    const mutations = this.tg.types[root.properties["mutation"]] as ObjectNode;

    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L36
      description: () => `${root.type} typegraph`,
      types: this.#typesResolver,
      queryType: () => {
        if (!queries || Object.values(queries.properties).length === 0) {
          // https://github.com/graphql/graphiql/issues/2308 (3x) enforce to keep empty Query type
          return this.formatter.formatType(queries, false, false);
        }
        return this.formatter.formatType(queries, false, false);
      },
      mutationType: () => {
        if (!mutations || Object.values(mutations.properties).length === 0) {
          return null;
        }
        return this.formatter.formatType(mutations, false, false);
      },
      subscriptionType: () => null,
      directives: () => [],
    };
  };

  #typesResolver: Resolver = (_) => {
    // filter non-native GraphQL types
    const filter = (
      type: TypeNode,
      input: {
        injectionTree: Record<string, InjectionNode>;
        path: string[];
      } | null,
    ) => {
      return (
        (input == null ||
          !isInjected(this.tg, type, input.path, input.injectionTree)) &&
        !isQuantifier(type)
      );
    };

    const scalarTypeIndices = new Set<number>();
    const inputTypeIndices = new Set<number>();
    const regularTypeIndices = new Set<number>();

    const inputRootTypeIndices = new Set<number>();
    const outputRootTypeIndices = new Set<number>();

    // decides whether or not custom object should be generated
    let hasUnion = false;
    let requireEmptyObject = false;

    const myVisitor: TypeVisitorMap = {
      [Type.FUNCTION]: ({ type }) => {
        // TODO skip if policy check fails
        // https://metatype.atlassian.net/browse/MET-119

        // the struct input of a function never generates a GrahpQL type
        // the actual inputs are the properties
        inputRootTypeIndices.add(type.input);
        outputRootTypeIndices.add(type.output);
        visitTypes(
          this.tg,
          getChildTypes(this.tg.types[type.input]),
          ({ type, idx }) => {
            hasUnion ||= isUnion(type) || isEither(type);
            if (isScalar(type)) {
              scalarTypeIndices.add(idx);
              this.formatter.scalarIndex.set(type.type, idx);
              return false;
            }
            // FIXME
            if (filter(type, null)) {
              inputTypeIndices.add(idx);
            }
            return true;
          },
        );
        return true;
      },
      default: ({ type, idx }) => {
        requireEmptyObject ||= isEmptyObject(type);

        if (
          inputRootTypeIndices.has(idx) &&
          !outputRootTypeIndices.has(idx)
        ) {
          return false;
        }
        // type is either a regular type or an input type reused in the output
        hasUnion ||= isUnion(type) || isEither(type);
        if (isScalar(type)) {
          scalarTypeIndices.add(idx);
          this.formatter.scalarIndex.set(type.type, idx);
          return false;
        }
        // FIXME
        if (filter(type, null)) {
          regularTypeIndices.add(idx);
        }
        return true;
      },
    };

    visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);
    const distinctScalars = distinctBy(
      [...scalarTypeIndices].map((idx) => this.tg.types[idx]),
      (t) => t.type, // for scalars: one GraphQL type per `type` not `title`
    );
    const scalarTypes = distinctScalars.map((type) =>
      this.formatter.formatType(type, false, false)
    );

    const adhocCustomScalarTypes = hasUnion
      ? distinctScalars.map((node) => {
        const idx = this.formatter.scalarIndex.get(node.type)!;
        const asObject = typeCustomScalar(node, idx);
        return this.formatter.formatType(asObject, false, false);
      })
      : [];

    const regularTypes = distinctBy(
      [...regularTypeIndices].map((idx) => this.tg.types[idx]),
      (t) => t.title,
    ).map((type) => this.formatter.formatType(type, false, false));

    const inputTypes = distinctBy(
      [...inputTypeIndices].map((idx) => this.tg.types[idx]),
      (t) => t.title,
    ).map((type) => this.formatter.formatType(type, false, true));

    const types = [
      ...scalarTypes,
      ...adhocCustomScalarTypes,
      ...regularTypes,
      ...inputTypes,
    ];

    // Handle non-root leaf case
    if (
      requireEmptyObject &&
      !types.some((t: any) => t!.title == "EmptyObject")
    ) {
      types.push(typeEmptyObjectScalar());
    }

    this.formatter.scalarIndex.clear();
    return types;
  };

  #getTypeResolver: Resolver = ({ name }) => {
    const type = this.tg.types.find((type) => type.title === name);
    return type ? this.formatter.formatType(type, false, false) : null;
  };
}
