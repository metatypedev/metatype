// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { removeMigrations } from "test-utils/migrations.ts";
import { assertStringIncludes } from "std/assert/mod.ts";
import pg from "npm:pg";

const m = new TestModule(import.meta);

const port = 7895;

const tgName = "migration-failure-test";

async function writeTypegraph(version: number | null) {
  if (version == null) {
    await m.shell([
      "bash",
      "-c",
      "cp ./templates/migration_failure.py migration_failure.py",
    ]);
  } else {
    await m.shell([
      "bash",
      "select.sh",
      "templates/migration_failure.py",
      `${version}`,
      "migration_failure.py",
    ]);
  }
}

async function deploy(noMigration = false) {
  const migrationOpts = noMigration ? [] : ["--create-migration"];

  try {
    const out = await m.cli(
      "deploy",
      "-t",
      "deploy",
      "-f",
      "migration_failure.py",
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

async function reset() {
  await removeMigrations(tgName);

  // remove the database schema
  const client = new pg.Client({
    connectionString: "postgres://postgres:password@localhost:5432/db",
  });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS e2e2 CASCADE");
  await client.end();
}

Meta.test(
  "meta deploy: fails migration for new columns without default value",
  async (t) => {
    await t.should("load first version of the typegraph", async () => {
      await reset();
      await writeTypegraph(null);
    });

    // `deploy` must be run outside of the `should` block,
    // otherwise this would fail by leaking ops.
    // That is expected since it creates new engine that persists beyond the
    // `should` block.
    await deploy();

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
      await deploy();
    } catch (e) {
      assertStringIncludes(
        e.message,
        'column "age" of relation "Record" contains null values: set a default value.',
      );
    }
  },
  { port, systemTypegraphs: true },
);

Meta.test(
  "meta deploy: succeeds migration for new columns with default value",
  async (t) => {
    await t.should("load first version of the typegraph", async () => {
      await reset();
      await writeTypegraph(null);
    });

    await deploy();

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
      await writeTypegraph(3); // int
    });

    await deploy();

    await t.should("load third version of the typegraph", async () => {
      await writeTypegraph(4); // string
    });

    await deploy();
  },
  { port, systemTypegraphs: true },
);
