// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  TypeGraph,
  type TypeGraphDS,
  type TypeMaterializer,
} from "../typegraph/mod.ts";
import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import type { ObjectNode } from "../typegraph/type_node.ts";
import type { Resolver } from "../types.ts";
import { TypeVisibility } from "./typegraph/visibility.ts";
import type { TypegateConfigBase } from "../config.ts";
import type { DenoRuntime } from "./deno/deno.ts";
import { IntrospectionTypeEmitter } from "./typegraph/type_emitter.ts";

export type DeprecatedArg = { includeDeprecated?: boolean };

export class TypeGraphRuntime extends Runtime {
  tg: TypeGraphDS;
  #typeGen: IntrospectionTypeEmitter | null = null;

  private constructor(tg: TypeGraphDS) {
    super(TypeGraph.formatName(tg));
    this.tg = tg;
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
    const getResolver = () => {
      if (stage.id() == "__schema") {
        // FIXME: other way to make sure we can start fresh at every request?

        // Assumes:
        // - root __schema is the first stage encountered
        // - stages are computed sequentially
        return this.#withPrecomputeVisibility(this.#delegate(stage));
      }

      return this.#delegate(stage);
    };

    return [
      new ComputeStage({
        ...stage.props,
        resolver: getResolver(),
      }),
    ];
  }

  initTypeGenerator(
    config: TypegateConfigBase,
    denoRuntime: DenoRuntime,
  ) {
    this.#typeGen = new IntrospectionTypeEmitter(
      this.tg,
      new TypeVisibility(this.tg, denoRuntime, config),
    );
  }

  get #types() {
    if (!this.#typeGen) {
      // Unreachable
      throw new Error("Invalid state: type generator not initialized");
    }

    return this.#typeGen!;
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

  #getSchemaResolver: Resolver = (args) => {
    const root = this.tg.types[0] as ObjectNode;
    return {
      // https://github.com/graphql/graphql-js/blob/main/src/type/introspection.ts#L36
      description: () => `${root.type} typegraph`,
      types: () => this.#typesResolver(args),
      queryType: () => this.#types.getRootSchema("Query"),
      mutationType: this.#types.getRootSchema("Mutation"),
      subscriptionType: () => null,
      directives: () => [],
    };
  };

  #typesResolver: Resolver = () => {
    return this.#types.getTypes();
  };

  #getTypeResolver: Resolver = ({ name }) => {
    return this.#types.findType(name) ?? null;
  };

  #withPrecomputeVisibility(resolver: Resolver): Resolver {
    return async (args) => {
      await this.#types.resetComputations(args);
      this.#types.emitRoot();

      return resolver(args);
    };
  }
}
