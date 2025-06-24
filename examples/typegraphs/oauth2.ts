// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { Auth } from "@typegraph/sdk/params";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

// skip:end

typegraph(
  {
    name: "oauth2-authentication",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const ctx = t.struct({ exp: t.integer().optional() });

    // highlight-start
    g.auth(
      Auth.oauth2({
        provider: "github",
        scopes: ["openid", "profile", "email"],
        clients: [
          { idSecret: "APP_CLIENT_ID", redirectUriSecret: "APP_REDIRECT_URI" },
        ],
      }),
    );
    // highlight-end

    g.expose(
      {
        get_context: deno.identity(ctx).apply({
          exp: g.fromContext("exp"),
        }),
      },
      pub,
    );
  },
);
