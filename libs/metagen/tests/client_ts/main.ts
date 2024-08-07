// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { alias, PreparedArgs, QueryGraph } from "./client.ts";

const api1 = new QueryGraph();

const gqlClient = api1.graphql(
  `http://localhost:${Deno.env.get("TG_PORT")}/sample`,
);

const prepared = gqlClient.prepareQuery((
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
  compositeArgs: api1.compositeArgs({ id: args.get("id") }, { _: "selectAll" }),
}));

const { scalarArgs, compositeArgs } = await prepared.do({
  id: "94be5420-8c4a-4e67-b4f4-e1b2b54832a2",
  slug: "s",
  title: "t",
});

const res = await gqlClient.query({
  // syntax very similar to typegraph definition
  user: api1.getUser({
    _: "selectAll",
    posts: alias({
      post1: { id: true, slug: true, title: true },
      post2: { _: "selectAll", id: false },
    }),
  }),
  posts: api1.getPosts({ _: "selectAll" }),

  scalarNoArgs: api1.scalarNoArgs(),
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
console.log(JSON.stringify(res));
