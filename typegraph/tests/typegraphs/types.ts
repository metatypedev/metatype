import { t, typegraph } from "../../deno/src/mod.ts";
import { DenoRuntime } from "../../deno/src/runtimes/deno.ts";

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

typegraph("test-types", (g) => {
  const deno = new DenoRuntime();
  g.expose({
    one: deno.func(s1, b, {
      code: "() => 12",
    }),
    two: deno.func(user, post, {
      code: "(user) => ({ id: 12, user })",
    }),
    three: deno.import(
      s1,
      s1,
      { name: "three", module: "scripts/three.ts" },
    ),
  });
});
