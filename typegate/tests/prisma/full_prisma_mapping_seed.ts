// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Engine } from "../../src/engine.ts";
import { gql, MetaTest, recreateMigrations } from "../utils.ts";

export async function seed(t: MetaTest, e: Engine) {
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

  // create test data
  await t.should("insert a record with nested object", async () => {
    await gql`
        mutation q {
          createOneUser (
            data: {
              id: 1,
              name: "Jack",
              age: 20,
              coinflips: [false, true, true]
              city: "Anyville",
              posts: {
                createMany: {
                  data: [
                    { id: 10001, title: "Some Title 1", views: 9, likes: 7, published: true },
                    { id: 10002, title: "Some Title 2", views: 6, likes: 3, published: false },
                    { id: 10003, title: "Some Title 3", views: 5, likes: 13, published: true },
                    { id: 10004, title: "Some Title 4", views: 5, likes: 14, published: true },
                    { id: 10005, title: "Some Title 4", views: 2, likes: 7, published: true },
                    { id: 10006, title: "Some Title 5", views: 0, likes: 0, published: false },
                    { id: 10007, title: "Some title", views: 0, likes: 4, published: true },
                    { id: 10008, title: "Yet another", views: 4, likes: 1, published: true },
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
}
