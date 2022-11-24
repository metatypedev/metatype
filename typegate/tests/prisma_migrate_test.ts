// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, removeMigrations, test } from "./utils.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "std/testing/asserts.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import config from "../src/config.ts";

const localDir = dirname(fromFileUrl(import.meta.url));
config.prisma_migration_folder = join(localDir, "prisma-migrations");

test("prisma migrations", async (t) => {
  const tgPath = "typegraphs/prisma.py";
  const e = await t.pythonFile(tgPath);
  const migrations = await t.load("prisma_migration");

  const migrationDir = join(localDir, "prisma-migrations/prisma/prisma");
  const createdMigrations: string[] = [];

  await t.should("drop schema and remove migrations", async () => {
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test CASCADE"
          parameters: "[]"
        )
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectData({
        executeRaw: 0,
      })
      .on(e);

    await removeMigrations(e);

    // queries should fail
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectErrorContains("table `test.record` does not exist")
      .on(e);
  });

  await t.should("create and apply migrations", async () => {
    await gql`
      mutation PrismaCreate {
        prismaCreate(typegraph: "prisma", name: "initial migration", apply: true) {
          createdMigrationName
          appliedMigrations
        }
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody(async (body) => {
        const { createdMigrationName, appliedMigrations } =
          body.data.prismaCreate;
        createdMigrations.push(createdMigrationName);

        const stat1 = await Deno.stat(
          join(migrationDir, "migration_lock.toml"),
        );
        assert(stat1.isFile);
        const stat2 = await Deno.stat(
          join(migrationDir, createdMigrationName, "migration.sql"),
        );
        assert(stat2.isFile);
        assertEquals(appliedMigrations.length, 1);
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

  await t.should("require database reset on drift", async () => {
    const path = join(migrationDir, createdMigrations[0]);
    await Deno.rename(path, `${path}_renamed`);
    await gql`
      mutation PrismaApply {
        prismaApply(typegraph: "prisma", resetDatabase: false) {
          appliedMigrations
        }
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectErrorContains("database reset required")
      .on(migrations);

    await gql`
      mutation PrismaApply {
        prismaApply(typegraph: "prisma", resetDatabase: true) {
          databaseReset
          appliedMigrations
        }
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody((body) => {
        const { appliedMigrations, databaseReset } = body.data.prismaApply;
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

  await t.should("apply pending migrations", async () => {
    // reset database
    // TODO use prismaReset mutation on prisma_migrations
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);

    await gql`
      mutation PrismaApply {
        prismaApply(typegraph: "prisma", resetDatabase: false) {
          databaseReset
          appliedMigrations
        }
      }
    `
      .withHeaders({
        "Authorization": "Basic YWRtaW46cGFzc3dvcmQ=",
      })
      .expectBody((body) => {
        const { appliedMigrations, databaseReset } = body.data.prismaApply;
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
}, { sanitizeOps: false }); // TODO enable sanitizer, find ops leak
