// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { seed } from "./full_prisma_mapping_seed.ts";

test("prisma filtering (WHERE)", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");
  await seed(t, e);

  await t.should(
    "filter with a complex nested query on findManyPosts",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              OR: [
                # OR operand 1
                {
                  AND: [
                    {
                      OR: [
                        {title: {contains: "Title 1"}},
                        {title: {contains: "Title 4"}},
                        # although not affecting the result
                        # not failing means they are accepted by prisma-engine
                        {likes: {in: [6]}},
                        {views: 9}
                      ]
                    },
                    {NOT: {views: {not: {gt: 5}}}},
                  ]
                },

                # OR operand 2
                {views: {lt: 3}},

                # OR operand 3
                {views: {equals: 9}} # or {views: 9}
              ],
            }
          ) {
            id
            title
            views
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10001, title: "Some Title 1", views: 9 },
          { id: 10005, title: "Some Title 4", views: 2 },
          { id: 10006, title: "Some Title 5", views: 0 },
          { id: 10007, title: "Some title", views: 0 },
        ],
      })
        .on(e);
    },
  );

  await t.should(
    "filter with simple nested query on findManyPosts",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              views: {not: {gte: 5}},
              title: {startsWith: "Some"},
              AND: [
                # 0 < likes <= 7
                {likes: {lte: 7}},
                {likes: {gt: 0}}
              ]
            }
          ) {
            id
            title
            views
            likes
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10005, title: "Some Title 4", views: 2, likes: 7 },
          { id: 10007, title: "Some title", views: 0, likes: 4 },
        ],
      })
        .on(e);
    },
  );

  await t.should(
    "not accept nested terminal `not` expressions (=/= `NOT` root expression)",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              # this is not Ok
              # not (lowercase) is a terminal node
              views: {not: {not: {equals: 5}}}
            }
          ) {
            id
            title
          }
        }
    `.expectErrorContains("mismatch")
        .on(e);
    },
  );

  await t.should(
    "accept nested root `NOT` expressions (=/= `not` terminal expression)",
    async () => {
      await gql`
        query {
          findManyPosts (
            where: {
              NOT: {
                NOT: {
                  NOT: {
                    NOT: {
                      NOT: {views: {not: 5}} # equiv. to equals
                    }
                  }
                }
              }
            }
          ) {
            id
            title
            views
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10003, title: "Some Title 3", views: 5 },
          { id: 10004, title: "Some Title 4", views: 5 },
        ],
      })
        .on(e);
    },
  );
});
