// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { g, t, typegraph } from "../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../typegraph/deno/src/runtimes/deno.ts";

const user = t.struct({
  id: t.integer(),
  //post: t.proxy("Post"),
}, { name: "User" });

const post = t.struct({
  id: t.integer(),
  author: user,
}, { name: "Post" });

typegraph("rest", (expose) => {
  const deno = new DenoRuntime();
  const pub = g.Policy.public();

  const postFromUser = deno.func(user, post, {
    code: "(user) => ({ id: 12, user })",
  }).withPolicy(pub);

  const readPost = deno.func(
    /*post.id*/ t.struct({ id: t.integer() }),
    t.boolean(),
    {
      code: "() => true",
      effect: { tag: "update" } as any,
    },
  ).withPolicy(pub);

  expose({
    postFromUser,
    readPost,
  });
});
