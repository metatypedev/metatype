// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("multiple relationships", async (t) => {
  const e = await t.engine("runtimes/prisma/multi_relations.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-multi",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  await t.should("insert a simple record", async () => {
    await gql`
      mutation q {
        createUser(data: { id: 12, name: "name", email: "email@example.com" }) {
          id
        }
      }
    `
      .expectData({
        createUser: { id: 12 },
      })
      .on(e);

    await gql`
      query {
        findUniqueUser(where: { id: 12 }) {
          id
          name
          email
          sentMessages {
            id
          }
          receivedMessages {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueUser: {
          id: 12,
          name: "name",
          email: "email@example.com",
          sentMessages: [],
          receivedMessages: [],
        },
      })
      .on(e);
  });

  await t.should("create many nested fields", async () => {
    await gql`
      mutation {
        createUser(
          data: {
            id: 15
            name: "User 15"
            email: "user15@example.com"
            sentMessages: {
              create: {
                id: 234
                time: 23456
                message: "Hi"
                recipient: { connect: { id: 12 } }
              }
              # createMany: {
              #   data: [
              #     {
              #       id: 234
              #       time: 23456
              #       message: "Hi"
              #       # recipientId: 12
              #     },
              #     {
              #       id: 235
              #       time: 23467
              #       message: "Are you OK?"
              #       # recipientId: 12
              #     }
              #   ]
              # }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 15,
        },
      })
      .on(e);

    await gql`
      query {
        findMessages(where: { sender: { id: 15 } }) {
          id
          time
          message
        }
      }
    `
      .expectData({
        findMessages: [
          { id: 234, time: 23456, message: "Hi" },
          // { id: 235, time: 23467, message: "Are you OK?" },
        ],
      })
      .on(e);

    await gql`
      mutation {
        deleteMessages(where: { sender: { id: 15 } }) {
          count
        }
      }
    `
      .expectData({
        deleteMessages: {
          count: 1,
        },
      })
      .on(e);
  });

  await gql`
    mutation {
      updateUser(
        where: { id: 15 }
        data: {
          sentMessages: {
            create: {
              id: 345
              message: "Hi"
              time: 34567
              recipient: { connect: { id: 12 } }
            }
          }
        }
      ) {
        sentMessages {
          id
        }
      }
    }
  `
    .expectData({
      updateUser: {
        sentMessages: [{ id: 345 }],
      },
    })
    .on(e);
});
