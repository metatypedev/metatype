// Copyright Metatype under the Elastic License 2.0.

import { Runtime } from "./Runtime.ts";
import { Resolver, ResolverArgs } from "../types.ts";
import { ComputeStage, Engine } from "../engine.ts";
import { Register } from "../register.ts";
import { PrismaRuntimeDS } from "../type_node.ts";
import { join } from "std/path/mod.ts";
import config from "../config.ts";
import * as native from "native";
import { ensure } from "../utils.ts";

export class PrismaMigration {
  private runtime: PrismaRuntimeDS;
  private _migrationFolderBase?: string;

  constructor(
    private engine: Engine,
    runtime: string | null = null,
  ) {
    const prismaRuntimes = this.engine.tg.tg.runtimes.filter(
      (rt) => rt.name == "prisma",
    ) as unknown as Array<PrismaRuntimeDS>;

    if (prismaRuntimes.length == 0) {
      throw new Error("no prisma runtime found in the selected typegraph");
    }

    if (runtime == null) {
      if (prismaRuntimes.length != 1) {
        throw new Error(
          "runtime selection required: more than one prisma runtimes are defined in typegraph",
        );
      }
      this.runtime = prismaRuntimes[0];
    } else {
      const runtimes = prismaRuntimes.filter((rt) => rt.data.name === runtime);
      if (runtimes.length == 0) {
        throw new Error(
          `prisma runtime "${runtime}" not found in the typegraph`,
        );
      }
      if (runtimes.length > 1) {
        throw new Error(
          `unexpected: more than one prisma runtimes are named "${runtime}`,
        );
      }
      this.runtime = runtimes[0];
    }
  }

  static OPS = {
    prismaDeploy: "deploy",
    prismaDiff: "diff",
    prismaCreate: "create",
    prismaApply: "apply",
  } as const;

  get migrationFolderBase() {
    if (this._migrationFolderBase != undefined) {
      return this._migrationFolderBase;
    }
    const base = config.prisma_migration_folder;

    if (!config.debug) {
      throw new Error("unpermitted operation for non-debug environment");
    }
    if (base == null) {
      throw new Error("PRISMA_MIGRATION_FOLDER env is required");
    }
    return base;
  }

  set migrationFolderBase(path: string) {
    this._migrationFolderBase = path;
  }

  get migrationFolder() {
    return join(
      this.migrationFolderBase,
      this.engine.name,
      this.runtime.data.name,
    );
  }

  diff: Resolver<{ script?: boolean }> = async ({ script = false }) => {
    const { datasource, datamodel, connection_string, name } =
      this.runtime.data;
    return {
      runtime: {
        name,
        connectionString: connection_string,
      },
      diff: (await native.prisma_diff({ datasource, datamodel, script })).diff,
    };
  };

  apply: Resolver<{ resetDatabase: boolean }> = async ({ resetDatabase }) => {
    const { datasource, datamodel } = this.runtime.data;
    const res = await native.prisma_apply({
      datasource,
      datamodel,
      migration_folder: this.migrationFolder,
      reset_database: resetDatabase,
    });

    if ("ResetRequired" in res) {
      throw new Error(
        `database reset required: ${res.ResetRequired.reset_reason}`,
      );
    }

    const { reset_reason, applied_migrations } = res.MigrationsApplied;

    return {
      databaseReset: reset_reason != null,
      appliedMigrations: applied_migrations,
    };
  };

  deploy: Resolver<{ migrations: string }> = async ({ migrations }) => {
    const { datasource, datamodel } = this.runtime.data;
    const res = await native.prisma_deploy({
      datasource,
      datamodel,
      migrations,
    });
    return {
      migrationCount: res.migration_count,
      appliedMigrations: res.applied_migrations,
    };
  };

  create: Resolver<{ name: string; apply?: boolean }> = async (
    { name: migrationName, apply = true },
  ) => {
    const { datasource, datamodel } = this.runtime.data;
    const res = await native.prisma_create({
      datasource,
      datamodel,
      migration_folder: this.migrationFolder,
      migration_name: migrationName,
      apply,
    });
    return {
      createdMigrationName: res.created_migration_name,
      appliedMigrations: res.applied_migrations,
    };
  };
}

export class PrismaMigrationRuntime extends Runtime {
  private constructor(private register: Register) {
    super();
  }

  static init(register: Register): Runtime {
    return new PrismaMigrationRuntime(register);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    let resolver: Resolver;
    const name = stage.props.materializer?.name;
    if (name && Object.keys(PrismaMigration.OPS).includes(name)) {
      resolver = (args) => {
        const { typegraph: tgName, runtime } = args as ResolverArgs<
          { typegraph: string; runtime: string }
        >;
        const engine = this.register.get(tgName);
        ensure(engine != null, `could not find typegraph ${tgName}`);
        const opName =
          PrismaMigration.OPS[name as keyof typeof PrismaMigration.OPS];
        const migration = new PrismaMigration(engine!, runtime);
        return (migration[opName] as Resolver<unknown>)(args);
      };
    } else {
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
