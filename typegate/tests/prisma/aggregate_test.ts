// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import { seed } from "./full_prisma_mapping_seed.ts";

test("aggregate", async (t) => {
  const e = await t.pythonFile("prisma/full_prisma_mapping.py");
  await seed(t, e);

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
        _count: { _all: 8, views: 8, likes: 8 },
        _sum: { views: 31, likes: 49 },
        _max: { views: 9, likes: 14 },
        _min: { views: 0, likes: 0 },
        _avg: { views: 3.875, likes: 6.125 },
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
});
