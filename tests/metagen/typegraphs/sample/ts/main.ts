// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { alias, PreparedArgs, QueryGraph, Transports } from "./client.ts";

const api1 = new QueryGraph();

const gqlClient = Transports.graphql(
  api1,
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

const preparedM = gqlClient.prepareMutation(
  (
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
    compositeArgs: api1.compositeArgs(
      {
        id: args.get("id"),
      },
      {
        _: "selectAll",
      },
    ),
  }),
);

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
  compositeArgs: api1.compositeArgs(
    {
      id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    },
    {
      _: "selectAll",
    },
  ),
});

const res5 = await gqlClient.query({
  scalarUnion: api1.scalarUnion({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  }),
  compositeUnion1: api1.compositeUnion(
    {
      id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    },
    {
      post: {
        _: "selectAll",
      },
    },
  ),
  compositeUnion2: api1.compositeUnion(
    {
      id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    },
    {
      user: {
        _: "selectAll",
        posts: { _: "selectAll" },
      },
    },
  ),
  mixedUnion: api1.mixedUnion(
    {
      id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    },
    {
      post: {
        _: "selectAll",
      },
      user: {
        _: "selectAll",
        posts: { _: "selectAll" },
      },
    },
  ),
});

const res6 = await gqlClient.query({
  scalarOnly: api1.nestedComposite({ _: "selectAll" }),
  withStruct: api1.nestedComposite({
    _: "selectAll",
    composite: { _: "selectAll" },
  }),
  withStructNested: api1.nestedComposite({
    _: "selectAll",
    composite: { _: "selectAll", nested: { _: "selectAll" } },
  }),
  withList: api1.nestedComposite({
    _: "selectAll",
    list: { _: "selectAll" },
  }),
});

const res7a = await gqlClient.query(api1.getPosts({ _: "selectAll" }));
const res7b = await gqlClient.mutation(
  api1.scalarArgs({
    id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
    slug: "",
    title: "",
  }),
);
const res7c = await gqlClient
  .prepareQuery((args) =>
    api1.identity({ input: args.get("num") }, { input: true })
  )
  .perform({ num: 0 });
const res7d = await gqlClient
  .prepareMutation((args) =>
    api1.identityUpdate({ input: args.get("num") }, { input: true })
  )
  .perform({ num: 0 });

const res7 = {
  singleQuery: res7a,
  singleMutation: res7b,
  singlePreparedQuery: res7c,
  singlePreparedMutation: res7d,
};

console.log(JSON.stringify([res1, res1a, res2, res3, res4, res5, res6, res7]));
