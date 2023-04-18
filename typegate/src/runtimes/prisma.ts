// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { FromVars, GraphQLRuntime } from "./graphql.ts";
import { ResolverError } from "../errors.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult, nativeVoid, pluralSuffix } from "../utils.ts";
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
import { registerHook } from "../hooks.ts";

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

registerHook("onPush", async (typegraph, secretManager, response) => {
  const runtimes = typegraph.runtimes.filter((rt) =>
    rt.name === "prisma"
  ) as unknown[] as PrismaRuntimeDS[];

  for (const rt of runtimes) {
    const { connection_string_secret, datamodel, migrations } = rt.data;
    if (migrations == null) {
      continue;
    }

    const datasource = makeDatasource(
      secretManager.secretOrFail(connection_string_secret),
    );

    const prefix = `[prisma runtime: '${rt.data.name}']`;

    if (rt.data.create_migration) { // same as `meta prisma dev`
      const applyRes = await native.prisma_apply({
        datasource,
        datamodel,
        migrations: migrations!,
        reset_database: rt.data.reset_on_drift ?? false,
      });
      if ("Err" in applyRes) {
        console.error(`prisma apply failed: ${applyRes.Err}`);
        throw new Error(applyRes.Err.message);
      }
      if ("ResetRequired" in applyRes) {
        response.resetDb(rt.data.name);
        throw new Error(
          `Database reset required: ${applyRes.ResetRequired.reset_reason}`,
        );
      }

      const { applied_migrations, reset_reason } = applyRes.Ok!;
      if (reset_reason != null) {
        response.info(`Database reset: {reset_reason}`);
      }
      if (applied_migrations.length === 0) {
        response.info(`${prefix} No migration applied.`);
      } else {
        const count = applied_migrations.length;
        response.info(
          `${prefix} ${count} migration${pluralSuffix(count)} applied:`,
        );
        for (const migrationName of applied_migrations) {
          response.info(`  - ${migrationName}`);
        }
      }

      // diff
      const { diff } = nativeResult(
        await native.prisma_diff({
          datasource,
          datamodel,
          script: false,
        }),
      );

      if (diff != null) {
        response.info(`Changes detected in the schema: ${diff}`);
        // create
        const { created_migration_name, migrations: newMigrations, apply_err } =
          nativeResult(
            await native.prisma_create({
              datasource,
              datamodel,
              migrations: migrations,
              migration_name: "generated",
              apply: true,
            }),
          );

        if (apply_err != null) {
          response.error(apply_err);
        }

        if (created_migration_name != null) {
          response.info(`Migration created: ${created_migration_name}`);
          if (apply_err == null) {
            response.info(`New migration applied: ${created_migration_name}`);
          }
          response.migration(rt.data.name, newMigrations!);
          rt.data.migrations = newMigrations;
        }
      }
    } else { // like `meta prisma deploy`
      const { migration_count, applied_migrations } = nativeResult(
        await native.prisma_deploy({
          datasource,
          datamodel,
          migrations: migrations!,
        }),
      );

      if (migration_count === 0) {
        response.info(`${prefix} No migration found.`);
      } else {
        response.info(
          `${prefix} ${migration_count} migration${
            pluralSuffix(migration_count)
          } found.`,
        );
      }
      if (applied_migrations.length === 0) {
        response.info(`${prefix} No migration applied.`);
      } else {
        const count = applied_migrations.length;
        response.info(
          `${prefix} ${count} migration${pluralSuffix(count)} applied:`,
        );
        for (const migrationName of applied_migrations) {
          response.info(`  - ${migrationName}`);
        }
      }
    }
  }

  return typegraph;
});

export class PrismaRuntime extends GraphQLRuntime {
  private constructor(private engine_name: string, private datamodel: string) {
    super(""); // no endpoint
    this.disableVariables();
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraph, args, secretManager } = params;
    const typegraphName = typegraph.types[0].title;

    const datasource = makeDatasource(secretManager.secretOrFail(
      args.connection_string_secret as string,
    ));
    const schema = `${datasource}${args.datamodel}`;
    const engine_name = `${typegraphName}_${args.name}`;
    const instance = new PrismaRuntime(engine_name, schema);
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

  execute(query: string | FromVars<string>, path: string[]): Resolver {
    return async ({ _: { variables } }) => {
      const startTime = performance.now();
      const q = typeof query === "function" ? query(variables) : query;
      logger.debug(`remote graphql: ${q}`);

      const ret = nativeResult(
        await native.prisma_query({
          engine_name: this.engine_name,
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
}
