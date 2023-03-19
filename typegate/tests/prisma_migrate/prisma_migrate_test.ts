// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, removeMigrations, test } from "../utils.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/testing/asserts.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import * as native from "native";
import { nativeResult } from "../../src/utils.ts";
import { init } from "../prisma/prisma_seed.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

test("prisma migrations", async (t) => {
  const tgPath = "prisma/prisma.py";
  const migrations = t.getTypegraph("typegate/prisma_migration")!;
  assertExists(migrations);

  const migrationDir = join(localDir, "../prisma-migrations/prisma/prisma");
  const createdMigrations: string[] = [];

  const e = await init(t, tgPath, false);
  
  await t.should("should fail", async () => {
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
        create(typegraph: "prisma", name: "initial migration", apply: true) {
          createdMigrationName
          appliedMigrations
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
          appliedMigrations,
          migrations,
          runtimeName,
        } = body.data.create;
        console.log({createdMigrations, createdMigrationName})

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

  let mig: string;

  await t.should("require database reset on drift", async () => {
    console.log({migrationDir, createdMigrations})
    const path = join(migrationDir, createdMigrations[0]);
    console.error({path});
    await Deno.rename(path, `${path}_renamed`);
    mig = nativeResult(
      await native.archive({ path: migrationDir }),
    ).base64;
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

  await t.should("apply pending migrations", async () => {
    // reset database
    // TODO use reset mutation on prisma_migrations
    await gql`
        mutation a {
          dropSchema
        }
      `
      .expectData({
        dropSchema: 0,
      })
      .on(e);
  
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
