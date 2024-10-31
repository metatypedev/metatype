// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { alias, PreparedArgs, QueryGraph } from "./client.ts";

const api1 = new QueryGraph();

const gqlClient = api1.graphql(
  `http://localhost:${Deno.env.get("TG_PORT")}/sample`,
);

const preparedQ = gqlClient.prepareQuery(() => ({
  user: api1.getUser({
    _: "selectAll",
    posts: alias({
      post1: { id: true, slug: true, title: true },
      post2: { _: "selectAll", id: false },
    }),
  }),
  posts: api1.getPosts({ _: "selectAll" }),

  scalarNoArgs: api1.scalarNoArgs(),
}));

const preparedM = gqlClient.prepareMutation((
  args: PreparedArgs<{
    id: string;
    slug: string;
    title: string;
  }>,
) => ({
  scalarArgs: api1.scalarArgs({
    id: args.get("id"),
    slug: args.get("slug"),
    title: args.get("title"),
  }),
  compositeNoArgs: api1.compositeNoArgs({
    _: "selectAll",
  }),
  compositeArgs: api1.compositeArgs({
    id: args.get("id"),
  }, {
    _: "selectAll",
  }),
}));

const res1 = await preparedQ.perform({});
const res1a = await preparedQ.perform({});

const res2 = await preparedM.perform({
  id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  slug: "s",
  title: "t",
});

const res3 = await gqlClient.query({
  user: api1.getUser({
    _: "selectAll",
    posts: alias({
      post1: { id: true, slug: true, title: true },
      post2: { _: "selectAll", id: false },
    }),
  }),
  posts: api1.getPosts({ _: "selectAll" }),

  scalarNoArgs: api1.scalarNoArgs(),
});

const res4 = await gqlClient.mutation({
  scalarArgs: api1.scalarArgs({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    slug: "",
    title: "",
  }),
  compositeNoArgs: api1.compositeNoArgs({
    _: "selectAll",
  }),
  compositeArgs: api1.compositeArgs({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }, {
    _: "selectAll",
  }),
});

const res5 = await gqlClient.query({
  scalarUnion: api1.scalarUnion({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }),
  compositeUnion1: api1.compositeUnion({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }, {
    post: {
      "_": "selectAll",
    },
  }),
  compositeUnion2: api1.compositeUnion({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }, {
    user: {
      "_": "selectAll",
    },
  }),
  mixedUnion: api1.mixedUnion({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }, {
    post: {
      "_": "selectAll",
    },
    user: {
      "_": "selectAll",
    },
  }),
});

console.log(JSON.stringify([res1, res1a, res2, res3, res4, res5]));
