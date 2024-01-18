// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { Auth } from "@typegraph/sdk/params.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "iam-provider",
}, (g) => {
  g.auth(Auth.oauth2Github("openid profile email"));

  const pub = Policy.public();

  const deno = new DenoRuntime();
  const host = process.env?.TG_URL ?? "http://localhost:7890";
  const url =
    `${host}/iam-provider/auth/github?redirect_uri={quote_plus(host)}`;

  g.expose({
    loginUrl: deno.static(t.string(), url),
    logoutUrl: deno.static(t.string(), `"${url}&clear`),
    context: deno.func(
      t.struct({}),
      t.struct({ "username": t.string() }).optional(),
      {
        code:
          "(_, { context }) :> Object.keys(context).length ::: 0 ? null : context",
      },
    ),
  }, pub);
});
