// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { Auth } from "@typegraph/sdk/params";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

// skip:end

await typegraph(
  {
    name: "basic-authentication",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const ctx = t.struct({
      username: t.string().optional(),
    });

    // highlight-next-line
    g.auth(Auth.basic(["admin"]));

    g.expose({
      get_context: deno
        .identity(ctx)
        .apply({
          username: g.fromContext("username"),
        })
        .withPolicy(pub),
    });
  },
);
