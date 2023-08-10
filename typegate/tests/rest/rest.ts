// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../typegraph/deno/src/runtimes/deno.ts";

const user = t.struct({
  id: t.integer(),
}, { name: "User" });

const post = t.struct({
  id: t.integer(),
  author: user,
}, { name: "Post" });

const complexType = t.struct({
  a: t.integer(),
  b: t.struct({ c: t.integer() }),
  d: t.email(),
  e: t.array(t.either([t.string(), t.integer()])).optional(),
  f: t.float({ enumeration: [1.0, 2.5] }),
}, { name: "ComplexType" });

typegraph("rest", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const postFromUser = deno.func(user, post, {
    code: "() => ({ id: 12, author: {id: 1}  })",
  }).withPolicy(pub);

  const readPost = deno.func(
    /*post.id*/ t.struct({ id: t.integer() }),
    t.boolean(),
    {
      code: "() => true",
      effect: { tag: "update" } as any,
    },
  ).withPolicy(pub);

  const identity = deno.func(
    t.struct({
      input: complexType,
    }),
    complexType,
    {
      code: "(x) => x['input']",
      effect: { tag: "none" } as any,
    },
  ).withPolicy(pub);

  g.expose({
    postFromUser,
    readPost,
    identity,
  });
});
