// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("prisma", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");

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

  // adding test datas
  await t.should("insert a record with nested object", async () => {
    await gql`
        mutation q {
            createOneUser (
                data: {
                    id: 1
                    name: "Jack"
                    age: 20
                    coinflips: [false, true, true]
                    city: "Anyville"
                    posts: {
                        create: { id: 10001, title: "Book 1" }
                    }
                    extended_profile: {
                        create: { id: 10111, bio: "Some bio 1" }
                    }
                }
            ) {
                id
            }
        }
    `.expectBody((body: any) => {
      console.log("BODY ::", body);
    })
      .on(e);
  });
});
