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

  // At this point, mixed runtime should work fine

  // graphql runtime bug ?
  // generated sub-query:
  // query Q {
  //   country {
  //     code
  //     name
  //   }
  // }
  // request err: Error: From remote graphql: Cannot query field "country" on type "Query".
  //   await t.should("find unique and work with graphql runtime", async () => {
  //     await gql`
  //           query {
  //             findUniqueRecord(where: {
  //               id: 1
  //             }) {
  //               id
  //               description
  //               country(code: "MC") {
  //                 code
  //                 name
  //               }
  //             }
  //           }
  //       `.expectData({
  //       findUniqueRecord: {
  //         id: 1,
  //         description: "Some description",
  //         country: { code: "MC", name: "Monaco" },
  //       },
  //     })
  //       .on(e);
  //   });
});
