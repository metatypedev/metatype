// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { FromVars, GraphQLRuntime } from "./graphql.ts";
import { ResolverError } from "../errors.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { envOrFail, nativeResult } from "../utils.ts";
import { ComputeStage } from "../engine.ts";
import * as ast from "graphql/ast";
import { ComputeArg } from "../planner/args.ts";
import { buildRawQuery } from "./utils/graphql_inline_vars.ts";
import { Materializer } from "../types/typegraph.ts";
import { getLogger } from "../log.ts";

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

export class PrismaRuntime extends GraphQLRuntime {
  datamodel: string;
  key: string;

  private constructor(datamodel: string) {
    super("");
    this.disableVariables();
    this.datamodel = datamodel;
    this.key = "";
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraph, args } = params;
    const typegraphName = typegraph.types[0].title;

    const datasource = makeDatasource(envOrFail(
      typegraphName,
      args.connection_string_secret as string,
    ));
    const schema = `${datasource}${args.datamodel}`;
    const instance = new PrismaRuntime(schema);
    await instance.registerEngine(typegraph.types[0].title);
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

  async registerEngine(typegraphName: string): Promise<void> {
    const conn = nativeResult(
      await native.prisma_register_engine({
        datamodel: this.datamodel,
        typegraph: typegraphName,
      }),
    );
    this.key = conn.engine_id;
  }

  async unregisterEngine(): Promise<void> {
    if (this.key === "") {
      throw new Error("unregistering unregistered engine");
    }
    const ret = await native.prisma_unregister_engine({
      key: this.key,
    });
    if ("Err" in ret) {
      throw new Error(ret.Err.message);
    }
    this.key = "";
  }

  execute(query: string | FromVars<string>, path: string[]): Resolver {
    return async ({ _: { variables } }) => {
      const startTime = performance.now();
      const q = typeof query === "function" ? query(variables) : query;
      logger.debug(`remote graphql: ${q}`);

      const ret = nativeResult(
        await native.prisma_query({
          key: this.key,
          query: {
            query: q,
            variables: {}, // TODO: remove this
          },
          datamodel: this.datamodel,
        }),
      );
      const endTime = performance.now();
      logger.debug(`queried prisma in ${(endTime - startTime).toFixed(2)}ms`);
      const res = JSON.parse(ret.res);
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
    args: Record<string, ComputeArg>,
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
}
