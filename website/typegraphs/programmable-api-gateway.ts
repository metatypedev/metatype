// skip:start

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// skip:end

typegraph({
  name: "programmable-api-gateway",
}, (g) => {
  const deno = new DenoRuntime();

  const pub = Policy.public();
  const roulette_access = deno.policy("roulette", "() => Math.random() < 0.5");

  // skip:next-line
  const myApiFormat = {
    "static_a": { foo: "rab", access: "roulette_access" },
    "static_b": { foo: "bar", access: "public" },
  };

  for (const [k, static_vals] of Object.entries(myApiFormat)) {
    const policy = static_vals["access"] == "public" ? pub : roulette_access;
    g.expose({
      [k]: deno.static(t.struct({ "foo": t.string() }), static_vals),
    }, policy);
  }
});
