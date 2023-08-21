// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql } from "../utils/mod.ts";
import { assertRejects } from "std/assert/mod.ts";
import { Meta } from "../utils/mod.ts";
import { dropSchemas, removeMigrations } from "../utils/migrations.ts";
import { shell } from "../utils/shell.ts";

const port = 7895;

Meta.test("cli:deploy - automatic migrations", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=e2e",
    },
  });

  await dropSchemas(e);
  await removeMigrations(e);

  const nodeConfigs = ["-t", "deploy"];

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
    await Meta.cli(
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
      Meta.cli("deploy", "-t", "deploy", "-f", "prisma/prisma.py")
    );
  });

  await t.should("commit changes", async () => {
    await shell(["git", "add", "."]);
    await shell(["git", "commit", "-m", "create migrations"]);
  });

  // not in t.should because it creates a worker that will not be closed
  await Meta.cli(
    "deploy",
    ...nodeConfigs,
    "-f",
    "runtimes/prisma/prisma.py",
  );

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

Meta.test("cli:deploy - with prefix", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=e2e",
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
    await Meta.cli(
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
      Meta.cli(
        "deploy",
        "-t",
        "with_prefix",
        "-f",
        "prisma/prisma.py",
      )
    );
  });

  await t.should("commit changes", async () => {
    await shell(["git", "add", "."]);
    await shell(["git", "commit", "-m", "create migrations"]);
  });

  // not in t.should because it creates a worker that will not be closed
  await Meta.cli(
    "deploy",
    ...nodeConfigs,
    "-f",
    "runtimes/prisma/prisma.py",
  );
  //

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
