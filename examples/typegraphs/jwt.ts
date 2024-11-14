// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { Auth } from "@typegraph/sdk/params.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

// skip:end

typegraph(
  {
    name: "jwt-authentication",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const ctx = t.struct({
      your_own_content: t.string().optional(),
    });
    // highlight-next-line
    g.auth(Auth.hmac256("custom"));

    g.expose(
      {
        get_context: deno.identity(ctx).apply({
          your_own_content: g.fromContext("your_own_content"),
        }),
      },
      pub,
    );
  },
);
