// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/assert/mod.ts";
import { join } from "std/path/mod.ts";
import * as native from "native";
import { nativeResult } from "../../src/utils.ts";
import { gql, Meta } from "../utils/mod.ts";
import { dropSchemas, removeMigrations } from "../utils/migrations.ts";
import { testDir } from "../utils/dir.ts";

Meta.test("prisma migrations", async (t) => {
  const tgPath = "runtimes/prisma/prisma.py";
  const migrations = t.getTypegraph("typegate/prisma_migration")!;
  assertExists(migrations);

  const migrationDir = join(
    testDir,
    "prisma-migrations/prisma/prisma",
  );
  const createdMigrations: string[] = [];

  const e = await t.engine(tgPath, {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-migrate",
    },
  });

  await dropSchemas(e);
  await removeMigrations(e);

  await t.should("should fail", async () => {
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectErrorContains("table `prisma-migrate.record` does not exist")
      .on(e);
  });

  await t.should("create and apply migrations", async () => {
    await gql`
      mutation PrismaCreate {
        create(typegraph: "prisma", name: "initial migration", apply: true) {
          createdMigrationName
          applyError
          migrations
          runtimeName
        }
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody(async (body) => {
        const {
          createdMigrationName,
          applyError,
          migrations,
          runtimeName,
        } = body.data.create;

        createdMigrations.push(createdMigrationName);

        assertEquals(runtimeName, "prisma");

        const ret = await native.unpack({ dest: migrationDir, migrations });
        assertEquals(ret, "Ok");

        const stat1 = await Deno.stat(
          join(migrationDir, "migration_lock.toml"),
        );
        assert(stat1.isFile);
        const stat2 = await Deno.stat(
          join(migrationDir, createdMigrationName, "migration.sql"),
        );
        assert(stat2.isFile);
        assert(applyError == null);
      })
      .on(migrations);

    // queries should succeed
    const id = "fed28fda-9ddb-450b-bfa1-1f990d9ec5d1";
    await gql`
      mutation M($id: String!) {
        createOneRecord(data: { id: $id, name: "name", age: 1 }) {
          id
        }
      }
    `
      .withVars({ id })
      .expectData({
        createOneRecord: { id },
      })
      .on(e);

    await gql`
      query {
        findManyRecords{
          id
          name
        }
      }
    `
      .expectData({
        findManyRecords: [
          {
            id,
            name: "name",
          },
        ],
      })
      .on(e);
  });

  let mig: string;

  await t.should("require database reset on drift", async () => {
    const path = join(migrationDir, createdMigrations[0]);
    await Deno.rename(path, `${path}_renamed`);
    mig = nativeResult(
      await native.archive({ path: migrationDir }),
    ).base64!;

    await gql`
      mutation PrismaApply($mig: String!) {
        apply(migrations: $mig, typegraph: "prisma", resetDatabase: false) {
          appliedMigrations
        }
      }
    `
      .withVars({ mig })
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectErrorContains("database reset required")
      .on(migrations);

    await gql`
      mutation PrismaApply($mig: String!) {
        apply(migrations: $mig, typegraph: "prisma", resetDatabase: true) {
          databaseReset
          appliedMigrations
        }
      }
    `
      .withVars({ mig })
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody((body) => {
        const { appliedMigrations, databaseReset } = body.data.apply;
        assert(databaseReset);
        assertArrayIncludes(
          appliedMigrations,
          createdMigrations.slice(0, 1).map((n) => `${n}_renamed`),
        );
      })
      .on(migrations);

    // database is empty
    await gql`
        query {
          findManyRecords{
            id
            name
          }
        }
      `
      .expectData({ findManyRecords: [] })
      .on(e);
  });

  await dropSchemas(e);

  await t.should("apply pending migrations", async () => {
    // TODO use reset mutation on prisma_migrations instead of dropSchemas
    await gql`
        mutation PrismaApply($mig: String!) {
          apply(migrations: $mig, typegraph: "prisma", resetDatabase: false) {
            databaseReset
            appliedMigrations
          }
        }
      `
      .withVars({ mig })
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody((body) => {
        const { appliedMigrations, databaseReset } = body.data.apply;
        assert(!databaseReset);
        assertArrayIncludes(
          appliedMigrations,
          createdMigrations.slice(0, 1).map((n) => `${n}_renamed`),
        );
      })
      .on(migrations);

    await gql`
        query {
          findManyRecords{
            id
            name
          }
        }
      `
      .expectData({ findManyRecords: [] })
      .on(e);
  });
}, { systemTypegraphs: true });
