// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("1:1 relationships", async (t) => {
  const tgPath = "prisma/prisma_1_1.py";
  const e = await t.pythonFile(tgPath);

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);
    await recreateMigrations(e);
  });

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
