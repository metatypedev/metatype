// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("prisma full mapping", async (t) => {
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
                    { id: 10001, title: "Some Title 1", views: 9, likes: 7, published: true },
                    { id: 10002, title: "Some Title 2", views: 6, likes: 3, published: false },
                    { id: 10003, title: "Some Title 3", views: 5, likes: 13, published: true },
                    { id: 10004, title: "Some Title 4", views: 5, likes: 14, published: true },
                    { id: 10005, title: "Some Title 4", views: 2, likes: 7, published: true },
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

  await t.should("paginate correctly with findManyPosts", async () => {
    await gql`
        query {
          findManyPosts(skip: 1, take: 2) {
            id
            title
          }
        }
    `.expectData({
      findManyPosts: [
        { id: 10002, title: "Some Title 2" },
        { id: 10003, title: "Some Title 3" },
      ],
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
        { id: 10004, likes: 14, views: 5 },
        { id: 10003, likes: 13, views: 5 },
        { id: 10005, likes: 7, views: 2 },
        { id: 10001, likes: 7, views: 9 },
        { id: 10002, likes: 3, views: 6 },
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
    `.expectData({
      groupByPost: [
        {
          published: true,
          _count: { _all: 4 },
          _sum: { likes: 41, views: 21 },
        },
        {
          published: false,
          _count: { _all: 1 },
          _sum: { likes: 3, views: 6 },
        },
      ],
    })
      .on(e);
  });

  /*
  await t.should("do a groupBy with having", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            having: {likes: {_sum: {equals: 3}}}
          )
          {
            published
            _sum { likes }
          }
        }
    `
      .expectBody((body: any) => {
        console.log("groupBy having output ::::", body);
      })
      .on(e);
  });*/

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
        _count: { _all: 5, views: 5, likes: 5 },
        _sum: { views: 27, likes: 44 },
        _max: { views: 9, likes: 14 },
        _min: { views: 2, likes: 3 },
        _avg: { views: 5.4, likes: 8.8 },
      },
    })
      .on(e);
  });

  await t.should(
    "aggregate after taking 2 items starting from the second row (skip first row)",
    async () => {
      await gql`
        query {
          aggregatePost(
            where: {author: {id: 1}},
            skip: 1,
            take: 2
          ) {
            _count { _all views likes }
            _sum { views likes }
            _max { views likes }
            _min { views likes }
            _avg { views likes }
          }
        }
      `.expectData({
        aggregatePost: {
          _count: { _all: 2, views: 2, likes: 2 },
          _sum: { views: 11, likes: 16 },
          _max: { views: 6, likes: 13 },
          _min: { views: 5, likes: 3 },
          _avg: { views: 5.5, likes: 8 },
        },
      })
        .on(e);
    },
  );

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

  await t.should(
    "update matching rows and return the count affected",
    async () => {
      await gql`
        mutation {
          updateManyPosts(
            where: {published: true},
            data: {
              views: {increment: 3},
              likes: {set: 123},
              published: {set: false},
              title: {set: "TITLE_MODIFIED"}
            }
          ) {
            count
          }
        }
    `.expectData({
        updateManyPosts: {
          count: 4,
        },
      })
        .on(e);
    },
  );

  await t.should(
    "create many users",
    async () => {
      await gql`
        mutation {
          createManyUsers(
            data: [
              { id: 2, name: "Robert", age: 21, coinflips: [false, true], city: "SomeVille" },
              { id: 3, name: "Kiki", age: 18, coinflips: [true], city: "AnotherVille" },
              { id: 4, name: "George", age: 18, coinflips: [false], city: "YetAnotherVille" },
            ]
          ) {
            count
          }
        }
    `.expectData({
        createManyUsers: {
          count: 3,
        },
      })
        .on(e);
    },
  );

  await t.should(
    "update ([up]sert) an existing user",
    async () => {
      await gql`
        mutation {
          upsertOneUser(
            where: {id: 2},
            create: { 
              id: 2, 
              name: "Robert", 
              age: 21, 
              coinflips: [false, true], 
              city: "SomeVille", 
              posts: { createMany: { data: [] } }
            },
            update: {
              name: {set: "New Name"},
              coinflips: {set: [false, false, false]}
            }
          ) {
            id
            name
            age
            coinflips
          }
        }
    `.expectData({
        upsertOneUser: {
          id: 2,
          name: "New Name",
          age: 21,
          coinflips: [false, false, false],
        },
      })
        .on(e);
    },
  );

  await t.should(
    "insert (up[sert]) a non-existing user",
    async () => {
      await gql`
        mutation {
          upsertOneUser(
            where: {id: 1234},
            create: {
              id: 1234,
              name: "Mark",
              age: 22,
              coinflips: [true],
              city: "SomeVille",
              posts: { 
                createMany: {
                  data: [
                    { id: 10021, title: "Some Title 21", views: 1, likes: 0, published: true },
                    { id: 10022, title: "Some Title 22", views: 5, likes: 3, published: true },
                  ] 
                } 
              }
            },
            # should not be applied
            update: {
              name: {set: "New Name"},
            }
          ) {
            id
            name
            age
            coinflips
            posts {
              id
              title
            }
          }
        }
    `.expectData({
        upsertOneUser: {
          id: 1234,
          name: "Mark",
          age: 22,
          coinflips: [true],
          posts: [
            { id: 10021, title: "Some Title 21" },
            { id: 10022, title: "Some Title 22" },
          ],
        },
      })
        .on(e);
    },
  );

  await t.should("do a count with findUniqueUser", async () => {
    await gql`
        query {
          findUniqueUser(where: {id: 1}) {
            id
            name
            age
            _count {
              posts
            }
          }
        }
    `.expectData({
      findUniqueUser: {
        id: 1,
        name: "Jack",
        age: 20,
        _count: { posts: 5 },
      },
    })
      .on(e);
  });

  await t.should("do a count with findManyUsers", async () => {
    await gql`
        query {
          findManyUsers {
            id
            name
            age
            _count {
              posts
            }
          }
        }
    `.expectData({
      findManyUsers: [
        { id: 1, name: "Jack", age: 20, _count: { posts: 5 } },
        { id: 3, name: "Kiki", age: 18, _count: { posts: 0 } },
        { id: 4, name: "George", age: 18, _count: { posts: 0 } },
        { id: 2, name: "New Name", age: 21, _count: { posts: 0 } },
        { id: 1234, name: "Mark", age: 22, _count: { posts: 2 } },
      ],
    })
      .on(e);
  });
});
