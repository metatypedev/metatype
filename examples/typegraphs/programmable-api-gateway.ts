// skip:start

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

// skip:end

typegraph(
  {
    name: "programmable-api-gateway",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();

    const pub = Policy.public();
    const roulette_access = deno.policy(
      "roulette",
      "() => Math.random() < 0.5"
    );

    // skip:next-line
    const myApiFormat = {
      static_a: { foo: "rab", access: "roulette_access" },
      static_b: { foo: "bar", access: "public" },
    };

    for (const [k, static_vals] of Object.entries(myApiFormat)) {
      const policy = static_vals["access"] == "public" ? pub : roulette_access;
      g.expose(
        {
          [k]: deno.static(t.struct({ foo: t.string() }), {
            foo: static_vals["foo"],
          }),
        },
        policy
      );
    }
  }
);
