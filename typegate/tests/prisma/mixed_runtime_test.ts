// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("prisma mixed runtime", async (t) => {
  const e = await t.pythonFile("prisma/mixed_runtime.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=test",
    },
  });

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        dropSchema
      }
    `
      .expectData({
        dropSchema: 0,
      })
      .on(e);
    await recreateMigrations(e);
  });

  await t.should(
    "insert a record without considering fields owned by other runtimes",
    async () => {
      await gql`
        mutation {
          createOneRecord (
            data: {
              id: 1,
              description: "Some description"
            }
          )
        {
          id
          description
        }
      }
    `.expectData({
        createOneRecord: {
          id: 1,
          description: "Some description",
        },
      })
        .on(e);
    },
  );

  await t.should("work with different runtimes: prisma, graphql", async () => {
    await gql`
        query {
          findUniqueRecord(where: {
            id: 1
          }) {
            id
            description
            post(id: "1") {
              id
              title
            }
          }
        }
    `.expectData({
      findUniqueRecord: {
        id: 1,
        description: "Some description",
        post: {
          id: "1",
          title:
            "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
        },
      },
    })
      .on(e);
  });
});
