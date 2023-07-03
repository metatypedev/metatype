// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { FromVars, GraphQLRuntime } from "./graphql.ts";
import { ResolverError } from "../errors.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid } from "../utils.ts";
import { ComputeStage } from "../engine.ts";
import * as ast from "graphql/ast";
import { ComputeArg } from "../planner/args.ts";
import { buildRawQuery } from "./utils/graphql_inline_vars.ts";
import {
  Materializer,
  PrismaRuntimeData,
  TGRuntime,
} from "../types/typegraph.ts";
import { getLogger } from "../log.ts";
import { TypeGraph } from "../typegraph.ts";

const logger = getLogger(import.meta);

export const makeDatasource = (uri: string) => {
  const scheme = new URL(uri).protocol.slice(0, -1);
  return `
  datasource db {
    provider = "${scheme}"
    url      = "${uri}"
  }
  `;
};

interface PrismaOperationMat extends Materializer {
  name: "prisma_operation";
  data: {
    operation: string;
    table: string;
  };
}

function isPrismaOperationMat(mat: Materializer): mat is PrismaOperationMat {
  return mat.name === "prisma_operation";
}

export interface PrismaRuntimeDS extends Omit<TGRuntime, "data"> {
  data: PrismaRuntimeData;
}

export class PrismaRuntime extends GraphQLRuntime {
  private constructor(
    readonly name: string,
    private engine_name: string,
    private datamodel: string,
  ) {
    super(""); // no endpoint
    this.disableVariables();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraph, args, secretManager } = params;
    const typegraphName = TypeGraph.formatName(typegraph);

    const datasource = makeDatasource(secretManager.secretOrFail(
      args.connection_string_secret as string,
    ));
    const datamodel = `${datasource}${args.datamodel}`;
    const engine_name = `${typegraphName}_${args.name}`;
    const instance = new PrismaRuntime(
      args.name as string,
      engine_name,
      datamodel,
    );
    await instance.registerEngine();
    return instance;
  }

  async deinit(): Promise<void> {
    await this.unregisterEngine();
  }

  static async introspection(uri: string): Promise<string> {
    const intro = nativeResult(
      await native.prisma_introspection({
        datamodel: makeDatasource(uri),
      }),
    );
    return intro.introspection;
  }

  async registerEngine(): Promise<void> {
    nativeVoid(
      await native.prisma_register_engine({
        engine_name: this.engine_name,
        datamodel: this.datamodel,
      }),
    );
  }

  async unregisterEngine(): Promise<void> {
    nativeVoid(
      await native.prisma_unregister_engine({
        engine_name: this.engine_name,
      }),
    );
  }

  async query(query: string) {
    const { res } = nativeResult(
      await native.prisma_query({
        engine_name: this.engine_name,
        query: {
          query,
          variables: {}, // TODO: remove this
        },
        datamodel: this.datamodel,
      }),
    );
    return JSON.parse(res);
  }

  override execute(query: FromVars<string>, path: string[]): Resolver {
    return async ({ _: { variables }, ...args }) => {
      const q = query({ ...variables, ...args });
      logger.debug(`remote graphql: ${q}`);

      const startTime = performance.now();
      const res = await this.query(q);
      const endTime = performance.now();
      logger.debug(`queried prisma in ${(endTime - startTime).toFixed(2)}ms`);

      if ("errors" in res) {
        throw new ResolverError(
          `Error from the prisma engine: ${
            res.errors
              .map((e: any) => e.user_facing_error?.message ?? e.error)
              .join("\n")
          }`,
        );
      }
      return path.reduce((r, field) => r[field], res.data);
    };
  }

  raw(
    materializer: PrismaOperationMat,
    args: ComputeArg<Record<string, unknown>> | null,
  ): Resolver {
    const operationType = materializer?.effect.effect != null
      ? ast.OperationTypeNode.MUTATION
      : ast.OperationTypeNode.QUERY;
    const query: FromVars<string> = (variables) =>
      `${operationType} { ${
        buildRawQuery(
          materializer.data.operation as "queryRaw" | "executeRaw",
          materializer.data.table,
          args,
          variables,
        )
      } }`;
    return this.execute(query, [materializer.data.operation]);
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const { materializer: mat } = stage.props;

    if (mat && isPrismaOperationMat(mat)) {
      const { operation } = mat.data;
      if (operation === "queryRaw" || operation === "executeRaw") {
        return [stage.withResolver(
          this.raw(
            mat,
            stage.props.args,
          ),
        )];
      }
    }

    return super.materialize(stage, waitlist, verbose);
  }

  override getRenames(stages: ComputeStage[]): Record<string, string> {
    const operationLevel = stages[0].props.path.length;

    const renames: Record<string, string> = {};
    for (const stage of stages) {
      const { node, path, materializer: mat } = stage.props;
      if (mat != null && path.length === operationLevel) {
        const { operation, table } = mat.data as {
          operation: string;
          table: string;
        };
        renames[node] = operation + table;
      }
    }

    return renames;
  }
}
