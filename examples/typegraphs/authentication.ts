// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { Auth } from "@typegraph/sdk/params";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

await typegraph(
  {
    name: "authentication",
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    // skip:end
    const deno = new DenoRuntime();

    const ctx = t.struct({
      username: t.string().optional(),
    });

    // highlight-start
    // expects a secret in metatype.yml
    // `BASIC_[username]`
    // highlight-next-line
    g.auth(Auth.basic(["andim"]));
    // highlight-end

    g.expose(
      {
        get_context: deno.identity(ctx).apply({
          username: g.fromContext("username"),
        }),
        get_full_context: deno.func(t.struct({}), t.string(), {
          code: "(_: any, ctx: any) => Deno.inspect(ctx.context)",
        }),
      },
      Policy.public(),
    );
    // skip:start
  },
);
// skip:end
