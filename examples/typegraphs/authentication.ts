// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

await typegraph({
  name: "authentication",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const ctx = t.struct({
    "username": t.string().optional(),
  });

  // highlight-start
  // expects a secret in metatype.yml
  // `BASIC_[username]`
  // highlight-next-line
  g.auth(Auth.basic(["admin"]));
  // highlight-end

  g.expose({
    get_context: deno.identity(ctx).apply({
      username: g.fromContext("username"),
    }).withPolicy(pub),
  });
});
