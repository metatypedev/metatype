// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, gql, recreateMigrations, test } from "../../utils.ts";

function runTest(tgPath: string, name: string) {
  test(name, async (t) => {
    const e = await t.pythonFile(tgPath, {
      secrets: {
        TG_PRISMA_POSTGRES:
          "postgresql://postgres:password@localhost:5432/db?schema=prisma-1-many",
      },
    });

    await dropSchemas(e);
    await recreateMigrations(e);

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
}

runTest("runtimes/prisma/prisma.py", "required one-to-many");
runTest("runtimes/prisma/optional_1_n.py", "optional one-to-many");
