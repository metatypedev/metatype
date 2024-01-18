import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph({
  name: "math",
}, (g) => {
  const deno = new DenoRuntime();

  const pub = Policy.public();

  const restrict_referer = deno.policy(
    "restrict_referer_policy",
    '(_, context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
  );

  const random_item_fn =
    "({ items }) => items[Math.floor(Math.random() * items.length)]";

  g.expose({
    fib: deno.import(
      t.struct({ "size": t.integer() }),
      t.list(t.float()),
      { module: "scripts/fib.ts", name: "default" },
    ).withPolicy(restrict_referer),
    random: deno.func(
      t.struct({}),
      t.float(),
      { code: "() :> Math.random()" },
    ).withPolicy(pub),
    randomItem: deno.func(
      t.struct({ "items": t.list(t.string()) }),
      t.string(),
      { code: random_item_fn },
    ).withPolicy(pub),
  });
});
