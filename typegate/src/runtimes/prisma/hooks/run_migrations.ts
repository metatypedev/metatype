// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PushHandler } from "../../../typegate/hooks.ts";
import { makeDatasource } from "../prisma.ts";
import { PrismaRT } from "../mod.ts";
import * as native from "native";
import { nativeResult, pluralSuffix } from "../../../utils.ts";

export const runMigrations: PushHandler = async (
  typegraph,
  secretManager,
  response,
) => {
  const runtimes = typegraph.runtimes.filter((rt) =>
    rt.name === "prisma"
  ) as PrismaRT.DS<PrismaRT.DataWithDatamodel>[];

  for (const rt of runtimes) {
    const { connection_string_secret, datamodel, migration_options } = rt
      .data;
    if (migration_options == null) {
      continue;
    }
    const { migration_files, create, reset } = migration_options;

    const datasource = makeDatasource(
      secretManager.secretOrFail(connection_string_secret),
    );

    const prefix = `[prisma runtime: '${rt.data.name}']`;

    if (create) { // same as `meta prisma dev`
      if (migration_files != null) {
        const applyRes = await native.prisma_apply({
          datasource,
          datamodel,
          migrations: migration_files!,
          reset_database: reset,
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

        const { reset_reason, applied_migrations } = applyRes.Ok;
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
              migrations: migration_files,
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
          rt.data.migration_options!.migration_files = newMigrations;
        }
      }
    } else { // like `meta prisma deploy`
      // diff
      const { diff } = nativeResult(
        await native.prisma_diff({
          datasource,
          datamodel,
          script: false,
        }),
      );
      if (diff != null) {
        response.warn(`Changes detected: ${diff}`);
        throw new Error(
          "Cannot run migrations: the migration files is not in sync with the typegraph and migration creation is disabled.",
        );
      }

      const { migration_count, applied_migrations } = nativeResult(
        await native.prisma_deploy({
          datasource,
          datamodel,
          migrations: migration_files!,
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
};
