// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { removeMigrations } from "test-utils/migrations.ts";
import { assertStringIncludes } from "std/assert/mod.ts";
import pg from "npm:pg";

const m = new TestModule(import.meta);

const tgName = "migration-failure-test";

/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

async function writeTypegraph(version: number | null) {
  if (version == null) {
    await m.shell([
      "bash",
      "-c",
      "cp ./templates/migration.py migration.py",
    ]);
  } else {
    await m.shell([
      "bash",
      "select.sh",
      "templates/migration.py",
      `${version}`,
      "migration.py",
    ]);
  }
}

async function deploy(port: number | null, noMigration = false) {
  const migrationOpts = noMigration ? [] : ["--create-migration"];

  try {
    const out = await m.cli(
      {},
      "deploy",
      "--target",
      port == null ? "dev" : `dev${port}`,
      "-f",
      "migration.py",
      "--allow-dirty",
      ...migrationOpts,
      "--allow-destructive",
    );
    if (out.stdout.length > 0) {
      console.log(
        `-- deploy STDOUT start --\n${out.stdout}-- deploy STDOUT end --`,
      );
    }
    if (out.stderr.length > 0) {
      console.log(
        `-- deploy STDERR start --\n${out.stderr}-- deploy STDERR end --`,
      );
    }
  } catch (e) {
    console.log(e.toString());
    throw e;
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
  "meta deploy: fails migration for new columns without default value",
  async (t) => {
    await t.should("load first version of the typegraph", async () => {
      await reset("e2e7895alt");
      await writeTypegraph(null);
    });

    const port = 7895;

    // `deploy` must be run outside of the `should` block,
    // otherwise this would fail by leaking ops.
    // That is expected since it creates new engine that persists beyond the
    // `should` block.
    await deploy(port);

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
      await writeTypegraph(1);
    });

    try {
      await deploy(port);
    } catch (e) {
      assertStringIncludes(
        e.message,
        'column "age" of relation "Record" contains null values: set a default value:',
      );
    }
  },
  { port: 7895, systemTypegraphs: true },
);
