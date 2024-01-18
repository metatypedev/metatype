// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "jwt-authentication",
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const ctx = t.struct(
    {
      "your_own_content": t.string().optional().fromContext("your_own_content"),
    },
  );
  // highlight-next-line
  g.auth(Auth.hmac256("custom"));

  g.expose({
    get_context: deno.identity(ctx),
  }, pub);
});
