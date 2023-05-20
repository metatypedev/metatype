// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Engine } from "../../../src/engine.ts";
import { dropSchemas, gql, recreateMigrations, test } from "../../utils.ts";
import { MetaTest } from "../../utils/metatest.ts";

async function runCommonTestSteps(t: MetaTest, e: Engine) {
  await t.should("create a record with a nested object", async () => {
    await gql`
      mutation {
        createUser(data: { id: 12, profile: { create: { id: 15 } } }) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 12,
        },
      })
      .on(e);

    await gql`
      query {
        findUniqueProfile(where: { id: 15 }) {
          id
          user {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueProfile: {
          id: 15,
          user: {
            id: 12,
          },
        },
      })
      .on(e);
  });
}

test("required 1-1 relationships", async (t) => {
  const e = await t.pythonFile("runtimes/prisma/normal_1_1.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-1-1",
    },
  });
  await dropSchemas(e);
  await recreateMigrations(e);

  await runCommonTestSteps(t, e);

  await t.should("delete fails with nested object", async () => {
    await gql`
      mutation {
        deleteUser(where: { id: 12 }) {
          id
        }
      }
    `
      .expectErrorContains("Foreign key constraint failed")
      .on(e);
  });
});

test("optional 1-1 relationships", async (t) => {
  const e = await t.pythonFile("runtimes/prisma/optional_1_1.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-1-1",
    },
  });
  await dropSchemas(e);
  await recreateMigrations(e);

  await runCommonTestSteps(t, e);

  // onDelete defaults to SetNull
  await t.should("delete row referenced by another row", async () => {
    await gql`
      mutation {
        deleteUser(where: { id: 12 }) {
          id
        }
      }
    `
      .expectData({
        deleteUser: {
          id: 12,
        },
      })
      .on(e);

    await gql`
      query {
        findUniqueProfile(where: {id: 15}) {
          id
          user {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueProfile: {
          id: 15,
          user: null,
        },
      })
      .on(e);
  });
});
