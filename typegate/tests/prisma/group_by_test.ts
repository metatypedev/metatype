// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { seed } from "./full_prisma_mapping_seed.ts";

test("groupBy", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");
  await seed(t, e);

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
          _count: { _all: 6 },
          _sum: { likes: 46, views: 25 },
        },
        {
          published: false,
          _count: { _all: 2 },
          _sum: { likes: 3, views: 6 },
        },
      ],
    })
      .on(e);
  });

  await t.should("do a groupBy with a basic having filter", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            having: {
              published: true,
              views: {_max: { gt: 1 }},

              # does nothing, just proves that the validation works
              # Note: fields does not have to be selected in the output
              likes: {_count: {lte: 100000}}
            }
          )
          {
            published
            _max { views likes }
            _sum { views likes }
          }
        }
    `
      .expectData({
        groupByPost: [
          {
            published: true,
            _max: { views: 9, likes: 14 },
            _sum: { views: 25, likes: 46 },
          },
        ],
      })
      .on(e);
  });

  await t.should("do a groupBy with a valid nested having filter", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            having: {
                AND: [
                  # AND operand 1
                  {
                    OR: [
                      {
                        published: true,
                        views: {_max: { gt: 1 }},
                      },
                      { NOT: { published: {not: false} } },
                      { views: {_count: {in : [-1, -2, -1000]} }}
                    ]
                  },

                  # AND operand 2
                  {
                    views: {_sum: {equals: 25}}
                  }

                  # AND operand 3
                  {
                    id: {_count: {gt: 0}}
                  }
                ]
            }
          )
          {
            published
            _count { _all }
            _max { views likes }
            _sum { views likes }
          }
        }
    `
      .expectData({
        groupByPost: [
          {
            published: true,
            _count: { _all: 6 },
            _max: { views: 9, likes: 14 },
            _sum: { views: 25, likes: 46 },
          },
        ],
      })
      .on(e);
  });
});
