// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("1:n relationships", async (t) => {
  const tgPath = "prisma/prisma.py";
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

  await t.should("insert a record with nested object", async () => {
    await gql`
      mutation q {
        createUser(
          data: {
            name: "name"
            email: "email@example.com"
            messages: {
              create: { id: 123, time: 12345, message: "Hello, Jack!" }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: { id: 1 },
      })
      .on(e);

    await gql`
      query {
        findUniqueUser(where: { id: 1 }) {
          id
          name
          email
          messages {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueUser: {
          id: 1,
          name: "name",
          email: "email@example.com",
          messages: [{ id: 123 }],
        },
      })
      .on(e);

    await gql`
      mutation {
        createUser(
          data: {
            id: 14
            name: "User 14"
            email: "user14@example.com"
            messages: {
              createMany: {
                data: [
                  { id: 234, time: 23456, message: "Hi" }
                  { id: 235, time: 23467, message: "Are you OK?" }
                ]
              }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 14,
        },
      })
      .on(e);

    await gql`
      query {
        findMessages(where: { sender: { id: 14 } }) {
          id
          time
          message
        }
      }
    `
      .expectData({
        findMessages: [
          { id: 234, time: 23456, message: "Hi" },
          { id: 235, time: 23467, message: "Are you OK?" },
        ],
      })
      .on(e);

    await gql`
      mutation {
        deleteMessages(where: { sender: { id: 14 } }) {
          count
        }
      }
    `
      .expectData({
        deleteMessages: {
          count: 2,
        },
      })
      .on(e);
  });

  await gql`
    mutation {
      updateUser(
        where: { id: 14 }
        data: { messages: { create: { id: 345, message: "Hi", time: 34567 } } }
      ) {
        messages {
          id
        }
      }
    }
  `
    .expectData({
      updateUser: {
        messages: [{ id: 345 }],
      },
    })
    .on(e);
});
