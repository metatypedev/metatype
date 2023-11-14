// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PushFailure, PushHandler } from "../../../typegate/hooks.ts";
import { makeDatasource } from "../prisma.ts";
import { PrismaRT } from "../mod.ts";
import * as native from "native";
import {
  nativeResult as nativeResultOriginal,
  pluralSuffix,
} from "../../../utils.ts";

function nativeResult<R>(res: { Ok: R } | { Err: { message: string } }) {
  try {
    return nativeResultOriginal(res);
  } catch (e) {
    throw new MigrationFailure(e.message, "<>");
  }
}

export class MigrationFailure extends Error {
  errors: PushFailure[];
  constructor(message: string, runtimeName: string) {
    super(message);

    const prefix = "ERROR: ";
    const prefixLen = prefix.length;
    const errors: PushFailure[] = message.split("\n")
      .filter((line) => line.startsWith(prefix))
      .map((line) => line.slice(prefixLen))
      .map((err) => {
        const match = NULL_CONSTRAINT_ERROR_REGEX.exec(err);
        if (match != null) {
          const { table, col } = match.groups!;
          return {
            reason: "NullConstraintViolation",
            message: [
              "Could not apply migration:",
              err,
              'Suggestion: set a default value: add `config={ "default": defaultValue }`',
            ].join("\n"),
            runtimeName,
            column: col,
            table,
          };
        } else {
          return {
            reason: "Unknown",
            message: ["Could not apply migration:", err].join(" "),
          };
        }
      });
    this.errors = errors;
  }
}

const NULL_CONSTRAINT_ERROR_REGEX =
  /column (?<col>".+") of relation (?<table>".+") contains null values/;

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
      response.info(`${prefix} option: reset=${reset}`);
      if (migration_files != null) {
        const applyRes = await native.prisma_apply({
          datasource,
          datamodel,
          migrations: migration_files!,
          reset_database: reset,
        });
        if ("Err" in applyRes) {
          throw new MigrationFailure(applyRes.Err.message, rt.data.name);
        }
        if ("ResetRequired" in applyRes) {
          throw new MigrationFailure(
            `Reset required: ${applyRes.ResetRequired.reset_reason}`,
            rt.data.name,
          );
        }

        const { reset_reason, applied_migrations } = applyRes.Ok;
        if (reset_reason != null) {
          response.info(`Database reset: ${reset_reason}`);
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
          throw new MigrationFailure(apply_err, rt.data.name);
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
      if (diff == null) {
        response.info(`${prefix} No changes detected in the database schema.`);
      } else {
        response.info(
          `${prefix} Changes detected in the database schema: ${diff}`,
        );
      }

      if (migration_files == null) {
        // TODO how to graciously fail??
        throw new Error("Unexpected: migration_files is null");
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
