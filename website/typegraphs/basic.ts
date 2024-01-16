// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "basic-authentication",
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const ctx = t.struct({
    "username": t.string().optional().fromContext("username"),
  });

  // highlight-next-line
  g.auth(Auth.basic(["admin"]));

  g.expose({
    get_context: deno.identity(ctx).withPolicy(pub),
  });
});
