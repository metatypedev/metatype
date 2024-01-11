// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

const a = t.integer();

const s1 = t.struct({ a, b: t.integer({ min: 12 }) });

const b = t.integer({ min: 12, max: 43 });

typegraph("test-types", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();
  const internal = Policy.internal();

  const user = t.struct({
    id: t.integer(),
    post: g.ref("Post"),
  }, { name: "User" });

  const post = t.struct({
    id: t.integer(),
    author: user,
  }, { name: "Post" });

  g.expose({
    one: deno.func(s1, b, {
      code: "() => 12",
    }).withPolicy(internal),
    two: deno.func(user, post, {
      code: "(user) => ({ id: 12, user })",
    }).withPolicy(deno.policy("deny", "() => false")),
    three: deno.import(
      s1,
      s1,
      { name: "three", module: "scripts/three.ts" },
    ).withPolicy(pub),
  });
});
