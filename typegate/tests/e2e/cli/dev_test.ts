// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { removeMigrations } from "test-utils/migrations.ts";
import pg from "npm:pg";
import { MetaDev } from "test-utils/metadev.ts";
import { join } from "std/path/mod.ts";

const m = new TestModule(import.meta);

const tgName = "migration-failure-test";

/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

async function writeTypegraph(version: number | null, target = "migration.py") {
  if (version == null) {
    await m.shell(["bash", "-c", `cp ./templates/migration.py ${target}`]);
  } else {
    await m.shell([
      "bash",
      "select.sh",
      "templates/migration.py",
      `${version}`,
      target,
    ]);
  }
}

async function reset(schema: string) {
  await removeMigrations(tgName);

  // remove the database schema
  const client = new pg.Client({
    connectionString: "postgres://postgres:password@localhost:5432/db",
  });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.end();
}

Meta.test(
  "meta dev: choose to reset the database",
  async (t) => {
    const migrationFile = join(t.workingDir, "migration.py");

    await t.should("load first version of the typegraph", async () => {
      await reset("e2e7895alt");
      await writeTypegraph(null, migrationFile);
    });

    const metadev = await MetaDev.start({
      cwd: t.workingDir,
      args: ["dev", "--target=dev7895"],
    });

    await metadev.fetchStderrLines((line) => {
      console.log("line:", line);
      return !line.includes(
        "Successfully pushed typegraph migration-failure-test",
      );
    });

    await t.should("insert records", async () => {
      const e = t.getTypegraphEngine(tgName);
      if (!e) {
        throw new Error("typegraph not found");
      }
      await gql`
        mutation {
          createRecord(data: {}) {
            id
          }
        }
      `
        .expectData({
          createRecord: {
            id: 1,
          },
        })
        .on(e);
    });

    await t.should("load second version of the typegraph", async () => {
      await writeTypegraph(1, migrationFile);
      await metadev.fetchStderrLines((line) => {
        console.log("line:", line);
        return !line.includes("[select]");
      });

      await metadev.writeLine("3");
    });

    await metadev.fetchStderrLines((line) => {
      console.log("line:", line);
      return !line.includes(
        "Successfully pushed typegraph migration-failure-test",
      );
    });

    await t.should("database be empty", async () => {
      const e = t.getTypegraphEngine(tgName);
      if (!e) {
        throw new Error("typegraph not found");
      }
      await gql`
        query {
          findRecords {
            id age
          }
        }
      `
        .expectData({
          findRecords: [],
        })
        .on(e);
    });

    await metadev.close();
  },
  {
    port: 7895,
    systemTypegraphs: true,
    gitRepo: {
      content: {
        // "prisma.py": "runtimes/prisma/prisma.py",
        "metatype.yml": "metatype.yml",
      },
    },
  },
);
