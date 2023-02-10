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
                    { id: 10001, title: "Book 1", views: 9, likes: 7, published: true },
                    { id: 10002, title: "Book 2", views: 8, likes: 3, published: false },
                    { id: 10003, title: "Book 3", views: 5, likes: 20, published: true },
                    { id: 10004, title: "Book 4", views: 5, likes: 14, published: true },
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

  await t.should("orderBy likes and views", async () => {
    await gql`
        query {
          findManyPosts(
            orderBy: [{likes: "desc"}, {views: "asc"}]
          )
          { 
            id
            likes
            views
          }
        }
    `.expectData({
      findManyPosts: [
        { id: 10003, likes: 20, views: 5 },
        { id: 10004, likes: 14, views: 5 },
        { id: 10001, likes: 7, views: 9 },
        { id: 10002, likes: 3, views: 8 },
      ],
    })
      .on(e);
  });

  await t.should("do a groupBy with orderBy", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            where: {author: {id: 1}},
            orderBy: [{_sum: {likes: "desc"}}]
          )
          {
            published
            _count { _all }
            _sum { likes views }
          }
        }
    `
      .expectData({
        groupByPost: [
          {
            published: true,
            _count: { _all: 3 },
            _sum: { likes: 41, views: 19 },
          },
          {
            published: false,
            _count: { _all: 1 },
            _sum: { likes: 3, views: 8 },
          },
        ],
      })
      .on(e);
  });

  await t.should("do an aggregate", async () => {
    await gql`
        query {
          aggregatePost(where: {author: {id: 1}}) {
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
        _sum: { views: 27, likes: 44 },
        _max: { views: 9, likes: 20 },
        _min: { views: 5, likes: 3 },
        _avg: { views: 6.75, likes: 11 },
      },
    })
      .on(e);
  });

  await t.should("do a distinct on col `published`", async () => {
    await gql`
        query {
          findManyPosts(distinct: ["published"]) {
            published
          }
        }
    `.expectData({
      findManyPosts: [
        { published: true },
        { published: false },
      ],
    })
      .on(e);
  });
});
