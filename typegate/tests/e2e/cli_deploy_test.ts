// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  dropSchemas,
  gql,
  meta,
  removeMigrations,
  shell,
  test,
} from "../utils.ts";
import { assertRejects } from "std/testing/asserts.ts";

const port = 7895;

test("cli:deploy - automatic migrations", async (t) => {
  const e = await t.pythonFile("runtimes/prisma/prisma.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=e2e",
    },
  });

  await dropSchemas(e);
  await removeMigrations(e);

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
      .expectErrorContains("table `e2e.record` does not exist")
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
    await assertRejects(() => meta("deploy", "-f", "prisma/prisma.py"));
  });

  await t.should("commit changes", async () => {
    await shell(["git", "add", "."]);
    await shell(["git", "commit", "-m", "create migrations"]);
  });

  await t.should("run migrations with `meta deploy`", async () => {
    await meta(
      "deploy",
      ...nodeConfigs,
      "-t",
      "deploy",
      "-f",
      "prisma/prisma.py",
    );
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
