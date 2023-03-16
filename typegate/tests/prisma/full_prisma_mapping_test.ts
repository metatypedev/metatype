// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { seed } from "./full_prisma_mapping_seed.ts";

test("prisma full mapping", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");

  await seed(t, e);

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
        { id: 10007, likes: 4, views: 0 },
        { id: 10002, likes: 3, views: 6 },
        { id: 10008, likes: 1, views: 4 },
        { id: 10006, likes: 0, views: 0 },
      ],
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
          count: 6,
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
});
