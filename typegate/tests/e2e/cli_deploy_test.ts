// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, meta, shell, test } from "../utils.ts";
import { init } from "../prisma/prisma_seed.ts";
import { assertRejects } from "std/testing/asserts.ts";

const port = 7895;

test("cli:deploy - automatic migrations", async (t) => {
  const e = await init(t, "prisma/prisma.py", false, {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=test",
    },
  });

  const nodeConfigs = [
    "--gate",
    `http://localhost:${port}`,
    "--username",
    "admin",
    "--password",
    "password",
  ];

  const prismaConfigs = [
    "--migrations",
    "prisma-migrations",
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
      .expectErrorContains("table `test.record` does not exist")
      .on(e);
  });

  await t.should("create migrations", async () => {
    await meta(
      { stdin: "initial_migration\n" },
      "prisma",
      "dev",
      ...nodeConfigs,
      ...prismaConfigs,
      "--create-only",
    );
  });

  await t.should("fail on dirty repo", async () => {
    await assertRejects(() =>
      meta("deploy", ...nodeConfigs, "-f", "prisma/prisma.py")
    );
  });

  await t.should("commit changes", async () => {
    await shell(["git", "add", "."]);
    await shell(["git", "commit", "-m", "create migrations"]);
  });

  await t.should("run migrations with `meta deploy`", async () => {
    await meta("deploy", ...nodeConfigs, "-f", "prisma/prisma.py");
  });

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
      .on(e);
  });
}, { systemTypegraphs: true, port, cleanGitRepo: true });
