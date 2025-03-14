// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../Runtime.ts";
import type { Resolver, ResolverArgs } from "../../types.ts";
import { ComputeStage, type QueryEngine } from "../../engine/query_engine.ts";
import type { Register } from "../../typegate/register.ts";
import * as native from "native";
import { nativeResult } from "../../utils.ts";
import { makeDatasource } from "./prisma.ts";
import type { PrismaRT } from "./mod.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta);

type PrismaRuntimeDS = PrismaRT.DS<PrismaRT.DataWithDatamodel>;

function findPrismaRuntime(engine: QueryEngine, name: string | null) {
  const prismaRuntimes = engine.tg.tg.runtimes.filter(
    (rt) => rt.name == "prisma",
  ) as Array<PrismaRuntimeDS>;

  if (prismaRuntimes.length == 0) {
    throw new Error("no prisma runtime found in the selected typegraph");
  }

  if (name == null) {
    if (prismaRuntimes.length != 1) {
      throw new Error(
        "runtime selection required: more than one prisma runtimes are defined in typegraph",
      );
    }
    return prismaRuntimes[0];
  } else {
    const runtimes = prismaRuntimes.filter((rt) => rt.data.name === name);
    if (runtimes.length == 0) {
      throw new Error(
        `prisma runtime "${name}" not found in the typegraph`,
      );
    }
    if (runtimes.length > 1) {
      throw new Error(
        `unexpected: more than one prisma runtimes are named "${name}`,
      );
    }
    return runtimes[0];
  }
}

export class PrismaMigrate {
  private datasource: string;

  constructor(
    engine: QueryEngine,
    private runtime: PrismaRuntimeDS,
    private migrations: string | null,
  ) {
    const { connection_string_secret } = runtime.data;
    this.datasource = makeDatasource(engine.tg.secretManager.secretOrFail(
      connection_string_secret as string,
    ));
  }

  apply: Resolver<{ resetDatabase: boolean }> = async ({ resetDatabase }) => {
    const { datamodel } = this.runtime.data;
    logger.info("prisma apply");
    const res = await native.prisma_apply({
      datasource: this.datasource,
      datamodel,
      migrations: this.migrations,
      reset_database: resetDatabase,
    });

    if ("Err" in res) {
      logger.error(`prisma apply error: ${res.Err.message}`);
      throw new Error(res.Err.message);
    }

    if ("ResetRequired" in res) {
      logger.error(
        `database reset required: ${res.ResetRequired.reset_reason}`,
      );
      throw new Error(
        `database reset required: ${res.ResetRequired.reset_reason}`,
      );
    }

    logger.info("prisma apply: successful");

    const { reset_reason, applied_migrations } = res.Ok;

    return {
      databaseReset: reset_reason != null,
      appliedMigrations: applied_migrations,
    };
  };

  create: Resolver<{ name: string; apply?: boolean }> = async (
    { name: migrationName, apply = true },
  ) => {
    const { datamodel, name } = this.runtime.data;
    const res = nativeResult(
      await native.prisma_create({
        datasource: this.datasource,
        datamodel,
        migrations: this.migrations,
        migration_name: migrationName,
        apply,
      }),
    );

    return {
      createdMigrationName: res.created_migration_name,
      applyError: res.apply_err,
      migrations: res.migrations,
      runtimeName: name,
    };
  };

  reset: Resolver<boolean> = async () => {
    logger.info("prisma reset");
    nativeResult(
      await native.prisma_reset({
        datasource: this.datasource,
      }),
    );
    logger.info("prisma reset: successful");

    return true;
  };
}

interface CommonArgs {
  typegraph: string;
  runtime: string | null;
  migrations: string | null;
}

type ResolverArgsEx<T = Record<string, any>> = ResolverArgs<CommonArgs & T>;

export class PrismaMigrationRuntime extends Runtime {
  // this instance is unique per register
  private constructor(
    private register: Register,
  ) {
    super("system");
  }

  static init(register: Register): Runtime {
    return new PrismaMigrationRuntime(register);
  }

  async deinit(): Promise<void> {}

  getMigrationTarget(
    tg: string,
    rt: string | null,
  ): [QueryEngine, PrismaRuntimeDS] {
    const engine = this.register.get(tg);
    if (engine == null) {
      throw new Error(`could not find typegraph ${tg}`);
    }
    const runtime = findPrismaRuntime(engine, rt);
    return [engine, runtime];
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    let resolver: Resolver;
    const name = stage.props.materializer?.name;

    switch (name) {
      case "apply":
      case "create":
        resolver = (async (
          args: ResolverArgsEx,
        ) => {
          const {
            typegraph: tg,
            runtime: rt,
            migrations,
            ...restArgs
          } = args;

          const [engine, runtime] = this.getMigrationTarget(tg, rt);

          const migrate = new PrismaMigrate(engine, runtime, migrations);

          return await migrate[name](restArgs as any);
        }) as Resolver;
        break;

      case "diff":
        resolver = (async (
          args: ResolverArgsEx<{ migrations: never; script: boolean }>,
        ) => {
          const { typegraph: tgName, runtime: rt, script } = args;
          const [engine, runtime] = this.getMigrationTarget(tgName, rt);
          const { connection_string_secret, datamodel, name } = runtime.data;
          const datasource = makeDatasource(
            engine.tg.secretManager.secretOrFail(
              connection_string_secret as string,
            ),
          );

          logger.info("prisma diff");
          const diff = await native.prisma_diff({
            datasource,
            datamodel,
            script,
          });
          logger.info("prisma diff: successful");

          return {
            runtimeName: name,
            diff,
          };
        }) as Resolver;
        break;

      case "deploy":
        resolver = (async (args: ResolverArgsEx<{ migrations: string }>) => {
          const { typegraph: tgName, runtime: rtName, migrations } = args;
          const engine = this.register.get(tgName);
          if (engine == null) {
            throw new Error(`could not find typegraph ${tgName}`);
          }
          const runtime = findPrismaRuntime(engine, rtName ?? null);
          const { connection_string_secret, datamodel } = runtime.data;
          const datasource = makeDatasource(
            engine.tg.secretManager.secretOrFail(
              connection_string_secret as string,
            ),
          );

          logger.info("prisma deploy");
          const res = nativeResult(
            await native.prisma_deploy({
              datasource,
              datamodel,
              migrations,
            }),
          );
          logger.info("prisma deploy: successful");

          return {
            migrationCount: res.migration_count,
            appliedMigrations: res.applied_migrations,
          };
        }) as Resolver;
        break;

      default:
        if (name != undefined) {
          throw new Error(`unhandled materializer "${name}"`);
        }

        resolver = async ({ _: { parent }, ...args }) => {
          const resolver = parent[stage.props.node];
          const ret = typeof resolver === "function"
            ? await resolver(args)
            : resolver;
          return ret;
        };
    }

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
