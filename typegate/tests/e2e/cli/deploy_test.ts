// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchemas, removeMigrations } from "test-utils/migrations.ts";
import { assertRejects, assertStringIncludes } from "std/assert/mod.ts";
import { randomSchema, reset } from "test-utils/database.ts";

const m = new TestModule(import.meta);

const tgName = "migration-failure-test";

/**
 * These tests use different ports for the virtual typegate instance to avoid
 * conflicts with one another when running in parallel.
 */

// TODO custom postgres schema
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

interface DeployOptions {
  port: number;
  noMigration?: boolean;
  secrets?: Record<string, string>;
}

async function deploy(
  { port, noMigration = false, secrets = {} }: DeployOptions,
) {
  const migrationOpts = noMigration ? [] : ["--create-migration"];
  const secretOpts = Object.entries(secrets).flatMap((
    [key, value],
  ) => `--secret=${key}=${value}`);

  try {
    const out = await m.cli(
      {},
      "deploy",
      "--target",
      "dev",
      `--gate=http://localhost:${port}`,
      ...secretOpts,
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

Meta.test(
  "meta deploy: fails migration for new columns without default value",
  async (t) => {
    const schema = randomSchema();
    const secrets = {
      TG_MIGRATION_FAILURE_TEST_PROGRES:
        `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
    };
    await t.should("load first version of the typegraph", async () => {
      await reset(tgName, schema);
      await writeTypegraph(null);
    });

    const port = t.port!;

    // `deploy` must be run outside of the `should` block,
    // otherwise this would fail by leaking ops.
    // That is expected since it creates new engine that persists beyond the
    // `should` block.
    await deploy({ port, secrets });

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
      await reset(tgName, schema);
      await deploy({ port, secrets });
    } catch (e) {
      assertStringIncludes(
        e.message,
        // 'column "age" of relation "Record" contains null values: set a default value:',
        'column "age" of relation "Record" contains null values',
      );
    }
  },
  { port: true, systemTypegraphs: true },
);

Meta.test(
  "meta deploy: succeeds migration for new columns with default value",
  async (t) => {
    const port = t.port!;
    const schema = randomSchema();
    const secrets = {
      TG_MIGRATION_FAILURE_TEST_POSTGRES:
        `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
    };
    await t.should("load first version of the typegraph", async () => {
      await reset(tgName, schema);
      await writeTypegraph(null);
    });

    await deploy({ port, secrets });

    await t.should("insert records", async () => {
      const e = t.getTypegraphEngine(tgName)!;

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

    await deploy({ port, secrets });

    await t.should("load third version of the typegraph", async () => {
      await writeTypegraph(4); // string
    });

    await deploy({ port, secrets });
  },
  { port: true, systemTypegraphs: true },
);

Meta.test(
  "cli:deploy - automatic migrations",
  async (t) => {
    const port = t.port!;
    const schema = randomSchema();
    const e = await t.engine("prisma.py", {
      secrets: {
        POSTGRES:
          `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      },
    });

    await dropSchemas(e);
    await removeMigrations(e);

    const nodeConfigs = [
      "--target",
      "dev",
      "--gate",
      `http://localhost:${port}`,
      "--secret",
      `TG_PRISMA_PROGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
    ];

    await t.should("fail to access database", async () => {
      await gql`
        query {
          findManyRecords {
            id
          }
        }
      `
        .expectErrorContains(`table \`${schema}.record\` does not exist`)
        .on(e);
    });

    await t.should("fail on dirty repo", async () => {
      await t.shell(["bash", "-c", "touch README.md"]);
      await assertRejects(() =>
        t.meta(["deploy", ...nodeConfigs, "-f", "prisma.py"])
      );
    });

    await t.should("commit changes", async () => {
      await t.shell(["git", "add", "."]);
      await t.shell(["git", "commit", "-m", "create migrations"]);
    });

    // not in t.should because it creates a worker that will not be closed
    await t.meta([
      "deploy",
      ...nodeConfigs,
      "-f",
      "prisma.py",
      "--create-migration",
    ]);

    await t.should(
      "succeed have replaced and terminated the previous engine",
      async () => {
        await gql`
          query {
            findManyRecords {
              id
            }
          }
        `
          .expectErrorContains("Could not find engine")
          .on(e);
      },
    );

    const e2 = t.getTypegraphEngine("prisma")!;

    await t.should("succeed to query database", async () => {
      await gql`
        query {
          findManyRecords {
            id
            name
          }
        }
      `
        .expectData({
          findManyRecords: [],
        })
        .on(e2);
    });
  },
  {
    systemTypegraphs: true,
    port: true,
    gitRepo: {
      content: {
        "prisma.py": "runtimes/prisma/prisma.py",
        "metatype.yml": "metatype.yml",
      },
    },
  },
);

Meta.test(
  "cli:deploy - with prefix",
  async (t) => {
    const schema = randomSchema();
    const e = await t.engine("prisma.py", {
      secrets: {
        POSTGRES:
          `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
      },
      prefix: "pref-",
    });

    await dropSchemas(e);
    await removeMigrations(e);

    const nodeConfigs = [
      "-t",
      "with_prefix",
      "--gate",
      `http://localhost:${t.port}`,
      "--secret",
      `TG_PRISMA_PROGRES=postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
    ];

    await t.should("fail to access database", async () => {
      await gql`
        query {
          findManyRecords {
            id
          }
        }
      `
        .expectErrorContains(`table \`${schema}.record\` does not exist`)
        .on(e);
    });

    // not in t.should because it creates a worker that will not be closed
    await t.meta([
      "deploy",
      ...nodeConfigs,
      "-f",
      "prisma.py",
      "--create-migration",
    ]);

    await t.should(
      "succeed have replaced and terminated the previous engine",
      async () => {
        await gql`
          query {
            findManyRecords {
              id
            }
          }
        `
          .expectErrorContains("Could not find engine")
          .on(e);
      },
    );

    const e2 = t.getTypegraphEngine("pref-prisma")!;

    await t.should("succeed to query database", async () => {
      await gql`
        query {
          findManyRecords {
            id
            name
          }
        }
      `
        .expectData({
          findManyRecords: [],
        })
        .on(e2);
    });
  },
  {
    systemTypegraphs: true,
    port: true,
    gitRepo: {
      content: {
        "prisma.py": "runtimes/prisma/prisma.py",
        "metatype.yml": "metatype.yml",
      },
    },
  },
);
