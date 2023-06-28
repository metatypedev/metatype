import { g, t, typegraph } from "../../../../deno/src/mod.ts";
import { DenoRuntime } from "../../../../deno/src/runtimes/deno.ts";

const a = t.integer();

const s1 = t.struct({ a, b: t.integer({ min: 12 }) });

const b = t.integer({ min: 12, max: 43 });

const user = t.struct({
  id: t.integer(),
  post: t.proxy("Post"),
}, { name: "User" });

const post = t.struct({
  id: t.integer(),
  author: user,
}, { name: "Post" });

typegraph("test-types", (expose) => {
  const deno = new DenoRuntime();
  const pub = g.Policy.public();
  const internal = g.Policy.internal();

  expose({
    one: deno.func(s1, b, {
      code: "() => 12",
    }).withPolicy(internal),
    two: deno.func(user, post, {
      code: "(user) => ({ id: 12, user })",
    }).withPolicy(deno.policy("deny", "() => false")),
    three: deno.import(
      s1,
      s1,
      { name: "three", module: "../scripts/three.ts" },
    ).withPolicy(pub),
  });
});
