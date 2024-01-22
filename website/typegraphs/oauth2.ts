// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "oauth2-authentication",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const ctx = t.struct({ "exp": t.integer().optional().fromContext("exp") });

  // highlight-start
  g.auth(
    Auth.oauth2Github("openid profile email"),
  );
  // highlight-end

  g.expose({
    get_context: deno.identity(ctx),
  }, pub);
});
