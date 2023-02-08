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
                createMany: {
                  data: [
                    { id: 10001, title: "Book 1", likes: 7, views: 13 },
                    { id: 10002, title: "Book 2", likes: 3, views: 7 },
                    { id: 10003, title: "Book 3", likes: 20, views: 15 },
                    { id: 10004, title: "Book 4", likes: 14, views: 2 },
                  ]
                }
              }
              extended_profile: {
                create: { id: 10111, bio: "Some bio 1" }
              }
            }
          ) 
        {
          id
        }
      }
    `.expectData({
      createOneUser: { id: 1 },
    })
      .on(e);
  });

  /*
  await t.should("do a groupBy likes", async () => {
    await gql`
        query {
          groupByPost(
            by: ["likes", "views"],
            _count: {
              _all: true,
            }
          )
          {
            _count {
              _all
            }
          }
        }
    `.expectBody((body: any) => {
      console.log("BODY ::", body);
    })
      .on(e);
  });*/

  await t.should("do an aggregate", async () => {
    await gql`
        query {
          aggregatePost
          {
            _count { _all views likes }
            _sum { views likes }
            _max { views likes }
            _min { views likes }
            _avg { views likes }
          }
        }
    `.expectData({
      aggregatePost: {
        _count: { _all: 4, views: 4, likes: 4 },
        _sum: { views: 37, likes: 44 },
        _max: { views: 15, likes: 20 },
        _min: { views: 2, likes: 3 },
        _avg: { views: 9.25, likes: 11 },
      },
    })
      .on(e);
  });
});
