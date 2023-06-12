import { t, typegraph } from "../../src/mod.ts";
import { DenoRuntime } from "../../src/runtimes/deno.ts";

const a = t.integer();
const b = t.integer({ min: 12 });
const c = t.integer({ min: 12, max: 43 });

const s1 = t.struct({ a, b: t.integer() });

const user = t.struct({
  id: t.integer(),
  post: t.proxy("Post"),
}, { name: "User" });

const post = t.struct({
  id: t.integer(),
  author: user,
}, { name: "Post" });

typegraph("test-types", (g) => {
  g.expose({
    one: DenoRuntime.func(s1, a, {
      code: "() => 12",
    }),
    two: DenoRuntime.func(user, post, {
      code: "(user) => ({ id: 12, user })",
    }),
  });
});
