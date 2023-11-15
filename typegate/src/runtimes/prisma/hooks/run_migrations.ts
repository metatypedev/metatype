// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  PushFailure,
  PushHandler,
  PushResponse,
} from "../../../typegate/hooks.ts";
import { makeDatasource } from "../prisma.ts";
import { PrismaRT } from "../mod.ts";
import * as native from "native";
import { nativeResult, pluralSuffix } from "../../../utils.ts";
import { MigrationOptions } from "../../../typegraph/types.ts";
import { SecretManager } from "../../../typegraph/mod.ts";

export class MigrationFailure extends Error {
  errors: PushFailure[] = [];
  private constructor(message: string, public runtimeName?: string) {
    super(message);
  }

  static resetRequired(runtimeName: string, reason: string) {
    const err = new MigrationFailure(
      `Database reset required:\n${reason}`,
      runtimeName,
    );
    err.errors.push({
      reason: "DatabaseResetRequired",
      message: reason,
      runtimeName,
    });
    return err;
  }

  static fromErrorMessage(message: string, runtimeName: string) {
    const err = new MigrationFailure(message, runtimeName);

    const prefix = "ERROR: ";
    const prefixLen = prefix.length;
    err.errors = message.split("\n")
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
            message:
              `Could not apply migration for runtime ${runtimeName}: \n{message}`,
          };
        }
      });
    return err;
  }
}

const NULL_CONSTRAINT_ERROR_REGEX =
  /column (?<col>".+") of relation (?<table>".+") contains null values/;

export const runMigrations: PushHandler = async (
  typegraph,
  secretManager,
  response,
) => {
  // TODO simpler: Use only one type for prisma runtime data, with some optional fields that would be set by hooks
  const runtimes = typegraph.runtimes.filter((rt) =>
    rt.name === "prisma"
  ) as PrismaRT.DS<PrismaRT.DataWithDatamodel>[];

  for (const rt of runtimes) {
    if (rt.data.migration_options == null) {
      response.warn(`Migrations disabled for runtime ${rt.data.name}`);
      continue;
    }

    const migration = new Migration(rt.data, secretManager, response);

    try {
      await migration.run();
    } catch (err) {
      const error = (err instanceof MigrationFailure)
        ? err
        : MigrationFailure.fromErrorMessage(err.message, rt.data.name);
      response.setFailure(error.errors[0]);
      throw error;
    }
  }

  return typegraph;
};

class Migration {
  #options: MigrationOptions;
  #runtimeName: string;
  #datasource: string;
  #datamodel: string;
  #logPrefix: string;

  constructor(
    private rtData: PrismaRT.DataWithDatamodel,
    secretManager: SecretManager,
    private response: PushResponse,
  ) {
    this.#options = rtData.migration_options!;
    this.#runtimeName = rtData.name;
    const connectionString = secretManager.secretOrFail(
      rtData.connection_string_secret,
    );
    this.#datasource = makeDatasource(connectionString);
    this.#datamodel = rtData.datamodel;
    this.#logPrefix = `(runtime: '${this.#runtimeName}')`;
  }

  async run() {
    const migrations = this.#options.migration_files;

    if (this.#options.create) { // like `prisma dev`
      // apply pending migrations
      if (migrations != null) {
        await this.#opApply(migrations);
      }

      if (await this.#opDiff()) {
        // create new migration
        await this.#opCreate();
      }
    } else { // like `prisma deploy`
      if (migrations == null) {
        this.#warn(
          [
            "No migration files.",
            "Please re-run with the --create-migrations flag to automatically create migrations.",
          ].join(" "),
        );
        return;
      }

      // display diff
      if (await this.#opDiff()) {
        this.#warn(
          [
            "No migration will be created for those changes.",
            "Please re-run with the --create-migrations flag to automatically create migrations.",
          ].join(" "),
        );
      }

      // apply migrations
      await this.#opDeploy(migrations);
    }
  }

  async #opApply(migrations: string, forceReset = false) {
    const res = await native.prisma_apply({
      datasource: this.#datasource,
      datamodel: this.#datamodel,
      migrations,
      reset_database: forceReset,
    });

    if ("Err" in res) {
      throw MigrationFailure.fromErrorMessage(
        res.Err.message,
        this.#runtimeName,
      );
    }

    if ("ResetRequired" in res) {
      if (this.#options.reset) {
        this.#warn(`Database reset required`);
        this.#warn(res.ResetRequired.reset_reason);
        this.#warn("Re-running the migrations with the `reset` flag");
        this.#opApply(migrations, true);
        return;
      } else {
        throw MigrationFailure.resetRequired(
          this.#runtimeName,
          res.ResetRequired.reset_reason,
        );
      }
    }

    const { reset_reason, applied_migrations } = res.Ok;

    if (reset_reason != null) {
      this.#warn(`Database was reset:`);
      this.#warn(reset_reason);
    }

    if (applied_migrations.length === 0) {
      this.#info(`No migration applied.`);
    } else {
      const count = applied_migrations.length;
      this.#info(`${count} migration${pluralSuffix(count)} applied:`);
      for (const migrationName of applied_migrations) {
        this.#info(`  - ${migrationName}`);
      }
    }
  }

  async #opDeploy(migrations: string) {
    const { migration_count, applied_migrations } = nativeResult(
      await native.prisma_deploy({
        datasource: this.#datasource,
        datamodel: this.#datamodel,
        migrations,
      }),
    );

    if (migration_count === 0) {
      this.#info(`No migration found.`);
    } else {
      const s = pluralSuffix(migration_count);
      this.#info(`${migration_count} migration${s} found.`);
    }

    if (applied_migrations.length === 0) {
      if (migration_count > 0) {
        this.#info(`No migration applied.`);
      }
    } else {
      const count = applied_migrations.length;
      const s = pluralSuffix(count);
      this.#info(`${count} migration${s} applied:`);
      for (const migrationName of applied_migrations) {
        this.#info(`  - ${migrationName}`);
      }
    }
  }

  async #opDiff(): Promise<boolean> {
    const { diff } = nativeResult(
      await native.prisma_diff({
        datasource: this.#datasource,
        datamodel: this.#datamodel,
        script: false,
      }),
    );

    if (diff != null) {
      this.#info(`Changes detected in the schema: ${diff}`);
      return true;
    } else {
      this.#info(`No changes detected in the schema.`);
      return false;
    }
  }

  async #opCreate() {
    this.#warn(`Creating migration for the changes.`);
    const res = nativeResult(
      await native.prisma_create({
        datasource: this.#datasource,
        datamodel: this.#datamodel,
        migrations: this.#options.migration_files,
        // TODO customizable??
        migration_name: "generated",
        apply: true,
      }),
    );

    const { created_migration_name, migrations, apply_err } = res;

    if (created_migration_name != null) {
      this.#info(`Migration created: ${created_migration_name}`);
      if (apply_err == null) {
        this.#info(`New migration applied: ${created_migration_name}`);
      }
      this.response.migration(this.#runtimeName, migrations!);
      this.rtData.migration_options!.migration_files = migrations;
    } else {
      this.#warn(`No migration created.`);
    }

    if (apply_err != null) {
      throw MigrationFailure.fromErrorMessage(apply_err, this.#runtimeName);
    }
  }

  #info(message: string) {
    this.response.info(`${this.#logPrefix} ${message}`);
  }

  #warn(message: string) {
    this.response.warn(`${this.#logPrefix} ${message}`);
  }
}
