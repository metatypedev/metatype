// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "@test-utils/mod.ts";
import { TestModule } from "@test-utils/test_module.ts";
import { removeMigrations } from "@test-utils/migrations.ts";
import pg from "npm:pg";

const m = new TestModule(import.meta);

const port = 7895;

async function selectVersion(version: number) {
  await m.shell([
    "bash",
    "select.sh",
    "templates/migration_failure.py",
    `${version}`,
    "migration_failure.py",
  ]);
}

async function deploy(noMigration = false) {
  const migrationOpts = noMigration ? [] : ["--create-migration"];
  await m.cli(
    "deploy",
    "-t",
    "deploy",
    "-f",
    "migration_failure.py",
    "--allow-dirty",
    ...migrationOpts,
    "--allow-destructive",
  );
}

async function reset() {
  await removeMigrations("migration-failure-test");

  // await m.cli("prisma", "reset", "-t", "deploy", "migration-failure-test");

  // remove the database schema
  const client = new pg.Client({
    connectionString: "postgres://postgres:password@localhost:5432/db",
  });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS e2e2 CASCADE");
  await client.end();
}

Meta.test("meta deploy: migration failure", async (t) => {
  await t.should("load first version of the typegraph", async () => {
    await reset();
    await selectVersion(1);
  });

  // `deploy` must be run outside of the `should` block,
  // otherwise this would fail by leaking ops.
  // That is expected since it creates new engine that persists beyond the
  // `should` block.
  await deploy();

  await t.should("load second version of the typegraph", async () => {
    await selectVersion(2);
  });

  await deploy();
}, { port, systemTypegraphs: true });
