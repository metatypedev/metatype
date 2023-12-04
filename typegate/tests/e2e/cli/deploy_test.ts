// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchemas, removeMigrations } from "test-utils/migrations.ts";
import { assertStringIncludes } from "std/assert/mod.ts";
import { assertRejects } from "std/assert/mod.ts";
import pg from "npm:pg";

const m = new TestModule(import.meta);

const tgName = "migration-failure-test";

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

async function deploy(port: number, noMigration = false) {
  const migrationOpts = noMigration ? [] : ["--create-migration"];

  try {
    const out = await m.cli(
      {},
      "deploy",
      "-t",
      `deploy${port}`,
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
    await deploy(7895);

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
      await deploy(7895);
    } catch (e) {
      assertStringIncludes(
        e.message,
        'column "age" of relation "Record" contains null values: set a default value:',
      );
    }
  },
  { port: 7895, systemTypegraphs: true },
);

Meta.test(
  "meta deploy: succeeds migration for new columns with default value",
  async (t) => {
    const port = 7896;
    await t.should("load first version of the typegraph", async () => {
      await reset();
      await writeTypegraph(null);
    });

    await deploy(port);

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

    await deploy(port);

    await t.should("load third version of the typegraph", async () => {
      await writeTypegraph(4); // string
    });

    await deploy(port);
  },
  { port: 7986, systemTypegraphs: true },
);

Meta.test("cli:deploy - automatic migrations", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=e2e",
    },
  });

  await dropSchemas(e);
  await removeMigrations(e);

  const nodeConfigs = ["-t", "deploy7897"];

  const prismaConfigs = [
    e.name,
  ];

  await t.should("fail to access database", async () => {
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectErrorContains("table `e2e.record` does not exist")
      .on(e);
  });

  await t.should("create migrations", async () => {
    await t.meta(
      ["prisma", "dev", ...nodeConfigs, ...prismaConfigs, "--create-only"],
      { stdin: "initial_migration\n" },
    );
  });

  await t.should("fail on dirty repo", async () => {
    await assertRejects(
      () => t.meta(["deploy", "-t", "deploy7897", "-f", "prisma.py"]),
      Error,
      "Dirty repository not allowed",
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
  ]);

  await t.should(
    "succeed have replaced and terminated the previous engine",
    async () => {
      await gql`
      query {
        findManyRecords{
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
        findManyRecords{
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
}, {
  systemTypegraphs: true,
  port: 7897,
  gitRepo: {
    content: {
      "prisma.py": "runtimes/prisma/prisma.py",
      "metatype.yml": "metatype.yml",
    },
  },
});

Meta.test("cli:deploy - with prefix", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES: "postgresql://postgres:password@localhost:5432/db?schema=e2e",
    },
    prefix: "pref-",
  });

  await dropSchemas(e);
  await removeMigrations(e);

  const nodeConfigs = [
    "-t",
    "with_prefix",
  ];

  const prismaConfigs = [
    e.rawName,
  ];

  await t.should("fail to access database", async () => {
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectErrorContains("table `e2e.record` does not exist")
      .on(e);
  });

  await t.should("create migrations", async () => {
    await t.meta(
      ["prisma", "dev", ...nodeConfigs, ...prismaConfigs, "--create-only"],
      { stdin: "initial_migration\n" },
    );
  });

  await t.should("fail on dirty repo", async () => {
    await assertRejects(() =>
      t.meta(["deploy", "-t", "with_prefix", "-f", "prisma/prisma.py"])
    );
  });

  await t.should("commit changes 2", async () => {
    await t.shell(["git", "add", "."]);
    await t.shell(["git", "commit", "-m", "create migrations"]);
  });

  // not in t.should because it creates a worker that will not be closed
  await t.meta(
    ["deploy", ...nodeConfigs, "-f", "prisma.py"],
  );

  await t.should(
    "succeed have replaced and terminated the previous engine",
    async () => {
      await gql`
      query {
        findManyRecords{
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
        findManyRecords{
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
}, {
  systemTypegraphs: true,
  port: 7894,
  gitRepo: {
    content: {
      "prisma.py": "runtimes/prisma/prisma.py",
      "metatype.yml": "metatype.yml",
    },
  },
});
