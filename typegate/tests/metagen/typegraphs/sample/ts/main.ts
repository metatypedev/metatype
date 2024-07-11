// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryGraph } from "./mdk.ts";

const api1 = new QueryGraph();

const gqlClient = api1.graphql(
  `http://localhost:${Deno.env.get("TG_PORT")}/sample`,
);

const res = await gqlClient.query({
  // syntax very similar to typegraph definition
  user: api1.getUser({ id: "1234" }, {
    _: "selectAll",
    posts: [{ filter: "top" }, { _: "selectAll", title: true, slug: true }],
  }),
  posts: api1.getPosts({ filter: "today" }, { _: "selectAll" }),
});
console.log(JSON.stringify(res));

/* const prepared = gqlClient.prepareQuery((args: { filter: string }) => ({
  posts2: api1.getPosts({ filter: args.filter }, { _: "selectAll" }),
}));

const { posts2 } = await prepared.do({ filter: "hey" }); */
