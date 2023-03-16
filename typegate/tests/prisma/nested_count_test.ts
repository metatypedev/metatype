// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { seed } from "./full_prisma_mapping_seed.ts";

test("nested count", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");
  await seed(t, e);

  await t.should("create a single test comment", async () => {
    await gql`
        mutation {
          createOneComment(
            data: { id: 50001, content: "good", related_post: {connect: {id: 10001}} }
          ) {
            id
            content
          }
        }
    `.expectData({
      createOneComment: {
        id: 50001,
        content: "good",
      },
    })
      .on(e);
  });

  await t.should(
    "do a nested count with findUniqueUser",
    async () => {
      await gql`
        query {
          findUniqueUser(where: {id: 1}) {
            id
            name
            age
            _count {
              posts
            }
            posts {
              id
              _count { comments }
            }
          }
        }
    `.expectData({
        findUniqueUser: {
          id: 1,
          name: "Jack",
          age: 20,
          _count: { posts: 8 },
          posts: [
            { id: 10001, _count: { comments: 1 } },
            { id: 10002, _count: { comments: 0 } },
            { id: 10005, _count: { comments: 0 } },
            { id: 10007, _count: { comments: 0 } },
            { id: 10003, _count: { comments: 0 } },
            { id: 10008, _count: { comments: 0 } },
            { id: 10004, _count: { comments: 0 } },
            { id: 10006, _count: { comments: 0 } },
          ],
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
        { id: 1, name: "Jack", age: 20, _count: { posts: 8 } },
        { id: 2, name: "Robert", age: 21, _count: { posts: 0 } },
        { id: 3, name: "Kiki", age: 18, _count: { posts: 0 } },
        { id: 4, name: "George", age: 18, _count: { posts: 0 } },
      ],
    })
      .on(e);
  });
});
