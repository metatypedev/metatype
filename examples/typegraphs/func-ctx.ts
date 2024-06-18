// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

await typegraph(
  {
    name: "func-ctx",
    rate: { windowLimit: 2000, windowSec: 60, queryLimit: 200, localExcess: 0 },
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();

    // skip:end
    g.expose(
      {
        ctx: deno.func(
          t.struct({}),
          t.struct({
            // the effect under which the function was run
            effect: t.enum_(["create", "read", "update", "delete"]),
            meta: t.struct({
              // url to host typegraph
              // can be used to talk to host typegraph from within
              // function
              url: t.string(), // token for accessing host typegraph
              token: t.string(),
            }),

            // http headers
            headers: t.list(t.list(t.string())),
            // typegraph secrets
            secrets: t.list(t.list(t.string())),

            // FIXME: explanation
            parent: t.string(),
            context: t.string(),
          }),
          {
            code: (_: any, ctx: any) => ({
              ...ctx,
              parent: JSON.stringify(ctx.parent),
              context: JSON.stringify(ctx.context),

              // modeling arbitrary associative arrays in
              // graphql is difficult so we return a listified format.
              // Follow the link for alternative solutions
              // https://github.com/graphql/graphql-spec/issues/101#issuecomment-170170967
              headers: Object.entries(ctx.headers),
              secrets: Object.entries(ctx.secrets),
            }),
          },
        ),
      },
      Policy.public(),
    );
    // skip:start
  },
);
